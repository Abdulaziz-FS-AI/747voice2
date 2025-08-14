-- Common Maintenance Queries for PIN-Based Voice Matrix System
-- Use these queries for regular maintenance and troubleshooting

-- ==============================================================================
-- CLIENT MANAGEMENT
-- ==============================================================================

-- View all clients with summary information
SELECT 
  id,
  pin,
  company_name,
  contact_email,
  created_at,
  pin_changed_at,
  is_active,
  (SELECT COUNT(*) FROM client_assistants WHERE client_id = c.id AND is_active = true) as assistant_count,
  (SELECT COUNT(*) FROM client_phone_numbers WHERE client_id = c.id AND is_active = true) as phone_count
FROM clients c
ORDER BY created_at DESC;

-- Find clients with duplicate PINs (should be empty)
SELECT pin, COUNT(*) as duplicate_count
FROM clients 
WHERE is_active = true
GROUP BY pin 
HAVING COUNT(*) > 1;

-- Find clients without any assistants
SELECT 
  c.id,
  c.company_name,
  c.contact_email,
  c.created_at
FROM clients c
LEFT JOIN client_assistants ca ON c.id = ca.client_id AND ca.is_active = true
WHERE c.is_active = true
  AND ca.id IS NULL
ORDER BY c.created_at DESC;

-- Find clients without any phone numbers
SELECT 
  c.id,
  c.company_name,
  c.contact_email,
  c.created_at
FROM clients c
LEFT JOIN client_phone_numbers cpn ON c.id = cpn.client_id AND cpn.is_active = true
WHERE c.is_active = true
  AND cpn.id IS NULL
ORDER BY c.created_at DESC;

-- ==============================================================================
-- ASSISTANT MANAGEMENT
-- ==============================================================================

-- View all assistant assignments with client info
SELECT 
  ca.id,
  ca.vapi_assistant_id,
  ca.display_name,
  ca.assigned_at,
  ca.updated_at,
  c.company_name,
  c.pin,
  c.is_active as client_active
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
WHERE ca.is_active = true
ORDER BY ca.assigned_at DESC;

-- Find assistants assigned to multiple clients
SELECT 
  vapi_assistant_id,
  COUNT(*) as client_count,
  STRING_AGG(c.company_name, ', ') as assigned_clients
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
WHERE ca.is_active = true
GROUP BY vapi_assistant_id
HAVING COUNT(*) > 1
ORDER BY client_count DESC;

-- Find orphaned assistants (client inactive)
SELECT 
  ca.id,
  ca.vapi_assistant_id,
  ca.display_name,
  ca.assigned_at,
  c.company_name,
  c.is_active as client_active
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
WHERE ca.is_active = true
  AND c.is_active = false
ORDER BY ca.assigned_at DESC;

-- ==============================================================================
-- PHONE NUMBER MANAGEMENT
-- ==============================================================================

-- View all phone number assignments with client and assistant info
SELECT 
  cpn.id,
  cpn.vapi_phone_id,
  cpn.phone_number,
  cpn.friendly_name,
  cpn.assigned_at,
  c.company_name,
  c.pin,
  ca.display_name as assistant_name
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
LEFT JOIN client_assistants ca ON ca.id = cpn.assigned_assistant_id
WHERE cpn.is_active = true
ORDER BY cpn.assigned_at DESC;

-- Find phone numbers without assigned assistants
SELECT 
  cpn.id,
  cpn.phone_number,
  cpn.friendly_name,
  c.company_name
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
WHERE cpn.is_active = true
  AND cpn.assigned_assistant_id IS NULL
ORDER BY cpn.assigned_at DESC;

-- Find duplicate phone numbers (should be empty)
SELECT 
  phone_number,
  COUNT(*) as duplicate_count,
  STRING_AGG(c.company_name, ', ') as assigned_clients
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
WHERE cpn.is_active = true
GROUP BY phone_number
HAVING COUNT(*) > 1;

-- ==============================================================================
-- CALL ANALYTICS
-- ==============================================================================

-- Recent call summary by client (last 7 days)
SELECT 
  c.company_name,
  COUNT(cl.id) as total_calls,
  AVG(cl.duration_seconds) as avg_duration_seconds,
  SUM(cl.duration_seconds) / 3600.0 as total_hours,
  COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as successful_calls,
  ROUND(
    COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END)::numeric / 
    NULLIF(COUNT(cl.id), 0) * 100, 
    2
  ) as success_rate_percent
FROM clients c
LEFT JOIN call_logs cl ON c.id = cl.client_id 
  AND cl.call_time >= CURRENT_DATE - INTERVAL '7 days'
WHERE c.is_active = true
GROUP BY c.id, c.company_name
ORDER BY total_calls DESC NULLS LAST;

-- Top performing assistants (last 30 days)
SELECT 
  ca.display_name,
  ca.vapi_assistant_id,
  c.company_name,
  COUNT(cl.id) as total_calls,
  AVG(cl.duration_seconds) as avg_duration_seconds,
  COUNT(CASE WHEN cl.call_status = 'completed' THEN 1 END) as successful_calls
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
LEFT JOIN call_logs cl ON ca.id = cl.assistant_id 
  AND cl.call_time >= CURRENT_DATE - INTERVAL '30 days'
WHERE ca.is_active = true
  AND c.is_active = true
GROUP BY ca.id, ca.display_name, ca.vapi_assistant_id, c.company_name
ORDER BY total_calls DESC NULLS LAST;

-- ==============================================================================
-- SESSION MANAGEMENT
-- ==============================================================================

-- View active sessions
SELECT 
  cs.id,
  cs.session_token,
  cs.created_at,
  cs.expires_at,
  cs.last_accessed,
  c.company_name,
  c.pin
FROM client_sessions cs
JOIN clients c ON c.id = cs.client_id
WHERE cs.expires_at > now()
ORDER BY cs.last_accessed DESC;

-- Clean up expired sessions (run periodically)
DELETE FROM client_sessions 
WHERE expires_at < now();

-- Count sessions per client
SELECT 
  c.company_name,
  c.pin,
  COUNT(cs.id) as active_sessions
FROM clients c
LEFT JOIN client_sessions cs ON c.id = cs.client_id 
  AND cs.expires_at > now()
WHERE c.is_active = true
GROUP BY c.id, c.company_name, c.pin
ORDER BY active_sessions DESC;

-- ==============================================================================
-- DATABASE HEALTH CHECKS
-- ==============================================================================

-- Check for foreign key violations (should be empty)
SELECT 'client_assistants' as table_name, COUNT(*) as orphaned_records
FROM client_assistants ca
LEFT JOIN clients c ON c.id = ca.client_id
WHERE c.id IS NULL
UNION ALL
SELECT 'client_phone_numbers' as table_name, COUNT(*) as orphaned_records
FROM client_phone_numbers cpn
LEFT JOIN clients c ON c.id = cpn.client_id
WHERE c.id IS NULL
UNION ALL
SELECT 'call_logs' as table_name, COUNT(*) as orphaned_records
FROM call_logs cl
LEFT JOIN clients c ON c.id = cl.client_id
WHERE c.id IS NULL;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'client_assistants', 'client_phone_numbers', 'call_logs')
ORDER BY schemaname, tablename, attname;

-- ==============================================================================
-- BULK OPERATIONS (USE WITH CAUTION)
-- ==============================================================================

-- Deactivate all resources for a specific client
-- UNCOMMENT AND MODIFY CAREFULLY:
/*
BEGIN;
UPDATE clients SET is_active = false WHERE company_name = 'CLIENT_NAME_HERE';
UPDATE client_assistants SET is_active = false WHERE client_id = (SELECT id FROM clients WHERE company_name = 'CLIENT_NAME_HERE');
UPDATE client_phone_numbers SET is_active = false WHERE client_id = (SELECT id FROM clients WHERE company_name = 'CLIENT_NAME_HERE');
DELETE FROM client_sessions WHERE client_id = (SELECT id FROM clients WHERE company_name = 'CLIENT_NAME_HERE');
COMMIT;
*/

-- Reset PIN for a client (generates new random PIN)
-- UNCOMMENT AND MODIFY CAREFULLY:
/*
UPDATE clients 
SET 
  pin = LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0'),
  pin_changed_at = now(),
  updated_at = now()
WHERE company_name = 'CLIENT_NAME_HERE';
*/

-- ==============================================================================
-- REPORTING QUERIES
-- ==============================================================================

-- Monthly usage report
SELECT 
  DATE_TRUNC('month', cl.call_time) as month,
  c.company_name,
  COUNT(cl.id) as total_calls,
  SUM(cl.duration_seconds) / 3600.0 as total_hours,
  AVG(cl.duration_seconds) as avg_call_duration
FROM call_logs cl
JOIN clients c ON c.id = cl.client_id
WHERE cl.call_time >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', cl.call_time), c.company_name
ORDER BY month DESC, total_calls DESC;