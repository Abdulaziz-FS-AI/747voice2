-- Assign VAPI Phone Number to Client Template
-- Replace the placeholder values below with actual information

-- First, verify the client exists
SELECT id, company_name FROM clients WHERE company_name = 'Acme Corporation';
-- Copy the client ID from above result

-- Second, verify available assistants for this client
SELECT 
  id,
  vapi_assistant_id,
  display_name,
  assigned_at
FROM client_assistants 
WHERE client_id = '00000000-0000-0000-0000-000000000000' -- REPLACE: Client ID from above
  AND is_active = true;
-- Copy the assistant ID you want to assign to this phone number

-- Step 1: Assign the phone number
INSERT INTO client_phone_numbers (
  client_id,                    -- Client UUID from first query
  vapi_phone_id,                -- VAPI phone number ID from VAPI dashboard
  phone_number,                 -- Formatted phone number (e.g., +1-555-0123)
  friendly_name,                -- Human-readable name for the phone line
  assigned_assistant_id         -- Assistant ID from second query (optional)
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- REPLACE: Client ID from step above
  'vapi_phone_123',                        -- REPLACE: VAPI phone number ID
  '+1-555-0123',                           -- REPLACE: Formatted phone number
  'Main Support Line',                     -- REPLACE: Friendly name
  '00000000-0000-0000-0000-000000000000'  -- REPLACE: Assistant ID (or NULL if no default)
);

-- Step 2: Verify the assignment
SELECT 
  cpn.id,
  cpn.vapi_phone_id,
  cpn.phone_number,
  cpn.friendly_name,
  cpn.assigned_at,
  ca.display_name as assistant_name,
  c.company_name,
  c.pin
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
LEFT JOIN client_assistants ca ON ca.id = cpn.assigned_assistant_id
WHERE c.company_name = 'Acme Corporation' -- REPLACE: Use actual company name
  AND cpn.is_active = true
ORDER BY cpn.assigned_at DESC;

-- Optional: Update assistant assignment later
-- UPDATE client_phone_numbers 
-- SET 
--   assigned_assistant_id = '00000000-0000-0000-0000-000000000000', -- REPLACE: New assistant ID
--   updated_at = now()
-- WHERE vapi_phone_id = 'vapi_phone_123' -- REPLACE: VAPI phone ID
--   AND is_active = true;

-- Notes:
-- 1. VAPI phone number must exist in VAPI dashboard first
-- 2. Assistant assignment is optional but recommended
-- 3. One phone number can only be assigned to one client
-- 4. Clients will see this phone number in their dashboard immediately
-- 5. Phone numbers can be reassigned to different assistants within the same client