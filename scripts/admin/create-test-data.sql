-- Admin script to create test data for the PIN-based system

-- Create multiple test clients
INSERT INTO public.clients (pin, company_name, contact_email, notes) VALUES
  ('111111', 'Acme Corporation', 'admin@acme.com', 'Premium client'),
  ('222222', 'TechStart Inc', 'contact@techstart.com', 'Startup client'),
  ('333333', 'Global Services Ltd', 'info@globalservices.com', 'Enterprise client'),
  ('444444', 'Local Business Co', 'owner@localbiz.com', 'Small business client');

-- Create assistants for Acme Corporation
WITH acme_client AS (
  SELECT id FROM public.clients WHERE pin = '111111' LIMIT 1
)
INSERT INTO public.client_assistants (
  client_id, 
  vapi_assistant_id, 
  display_name,
  first_message,
  voice,
  model,
  eval_method,
  max_call_duration,
  system_prompt,
  questions
)
SELECT 
  ac.id,
  'vapi-acme-sales-001',
  'Sales Assistant',
  'Welcome to Acme Corporation. How may I assist you with our products today?',
  'en-US-Wavenet-F',
  'gpt-4',
  'contains',
  900,
  'You are a professional sales assistant for Acme Corporation. Be helpful and knowledgeable about our products.',
  '[{"question": "What products do you offer?", "answer": "We offer a wide range of business solutions."}]'::jsonb
FROM acme_client ac
UNION ALL
SELECT 
  ac.id,
  'vapi-acme-support-001',
  'Support Assistant',
  'Hello! This is Acme support. How can I help you today?',
  'en-US-Wavenet-D',
  'gpt-3.5-turbo',
  'exact',
  600,
  'You are a technical support assistant for Acme Corporation. Help customers with their technical issues.',
  '[{"question": "I need technical help", "answer": "I can help you with that."}]'::jsonb
FROM acme_client ac;

-- Create assistants for TechStart Inc
WITH tech_client AS (
  SELECT id FROM public.clients WHERE pin = '222222' LIMIT 1
)
INSERT INTO public.client_assistants (
  client_id, 
  vapi_assistant_id, 
  display_name,
  first_message,
  voice,
  model,
  eval_method,
  max_call_duration,
  system_prompt
)
SELECT 
  tc.id,
  'vapi-tech-demo-001',
  'Demo Scheduler',
  'Hi! I can help you schedule a product demo. When would you like to see our platform?',
  'en-US-Standard-C',
  'gpt-3.5-turbo',
  'contains',
  300,
  'You are a demo scheduling assistant for TechStart Inc. Help potential customers book product demonstrations.'
FROM tech_client tc;

-- Create phone numbers for Acme Corporation
WITH acme_client AS (
  SELECT id FROM public.clients WHERE pin = '111111' LIMIT 1
),
acme_sales AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi-acme-sales-001' LIMIT 1
),
acme_support AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi-acme-support-001' LIMIT 1
)
INSERT INTO public.client_phone_numbers (
  client_id,
  vapi_phone_id,
  phone_number,
  friendly_name,
  assigned_assistant_id,
  notes
) 
SELECT 
  ac.id,
  'vapi-phone-acme-001',
  '+1-555-0100',
  'Acme Sales Line',
  asa.id,
  'Main sales number'
FROM acme_client ac, acme_sales asa
UNION ALL
SELECT 
  ac.id,
  'vapi-phone-acme-002',
  '+1-555-0101',
  'Acme Support Line',
  asu.id,
  'Technical support number'
FROM acme_client ac, acme_support asu;

-- Create phone number for TechStart
WITH tech_client AS (
  SELECT id FROM public.clients WHERE pin = '222222' LIMIT 1
),
tech_demo AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi-tech-demo-001' LIMIT 1
)
INSERT INTO public.client_phone_numbers (
  client_id,
  vapi_phone_id,
  phone_number,
  friendly_name,
  assigned_assistant_id
)
SELECT 
  tc.id,
  'vapi-phone-tech-001',
  '+1-555-0200',
  'TechStart Demo Line',
  td.id
FROM tech_client tc, tech_demo td;

-- Create sample call logs for analytics
WITH acme_client AS (
  SELECT id FROM public.clients WHERE pin = '111111' LIMIT 1
),
acme_sales AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi-acme-sales-001' LIMIT 1
),
acme_phone AS (
  SELECT id FROM public.client_phone_numbers WHERE vapi_phone_id = 'vapi-phone-acme-001' LIMIT 1
)
INSERT INTO public.call_logs (
  client_id,
  assistant_id,
  phone_number_id,
  vapi_call_id,
  caller_number,
  call_time,
  duration_seconds,
  cost,
  call_status,
  call_type,
  success_evaluation,
  assistant_display_name,
  transcript,
  summary
)
SELECT 
  ac.id,
  asa.id,
  ap.id,
  'vapi-call-' || generate_series,
  '+1-555-' || LPAD((1000 + generate_series)::text, 4, '0'),
  timezone('utc'::text, now()) - (generate_series || ' hours')::interval,
  60 + (random() * 540)::integer, -- 1-10 minutes
  0.10 + (random() * 2)::numeric(10,2), -- $0.10-$2.10
  CASE WHEN random() > 0.1 THEN 'completed' ELSE 'failed' END,
  CASE WHEN random() > 0.3 THEN 'inbound' ELSE 'outbound' END,
  random() > 0.2, -- 80% success rate
  'Sales Assistant',
  'Sample transcript for call ' || generate_series,
  'Customer inquired about product pricing and features.'
FROM 
  acme_client ac, 
  acme_sales asa,
  acme_phone ap,
  generate_series(1, 50); -- Generate 50 sample calls

-- Process analytics for the created calls
WITH call_data AS (
  SELECT 
    client_id,
    assistant_id,
    DATE(call_time) as call_date,
    duration_seconds,
    (cost * 100)::integer as cost_cents,
    success_evaluation
  FROM public.call_logs
  WHERE vapi_call_id LIKE 'vapi-call-%'
)
INSERT INTO public.call_analytics (
  client_id,
  assistant_id,
  date,
  total_calls,
  successful_calls,
  failed_calls,
  total_duration_seconds,
  total_cost_cents
)
SELECT 
  client_id,
  assistant_id,
  call_date,
  COUNT(*),
  SUM(CASE WHEN success_evaluation = true THEN 1 ELSE 0 END),
  SUM(CASE WHEN success_evaluation = false THEN 1 ELSE 0 END),
  SUM(duration_seconds),
  SUM(cost_cents)
FROM call_data
GROUP BY client_id, assistant_id, call_date
ON CONFLICT (client_id, assistant_id, date) DO UPDATE SET
  total_calls = EXCLUDED.total_calls,
  successful_calls = EXCLUDED.successful_calls,
  failed_calls = EXCLUDED.failed_calls,
  total_duration_seconds = EXCLUDED.total_duration_seconds,
  total_cost_cents = EXCLUDED.total_cost_cents;

-- Update calculated fields in analytics
UPDATE public.call_analytics
SET
  average_call_duration = CASE 
    WHEN total_calls > 0 THEN ROUND(total_duration_seconds::numeric / total_calls, 2)
    ELSE 0
  END,
  success_rate = CASE 
    WHEN total_calls > 0 THEN ROUND((successful_calls::numeric / total_calls) * 100, 2)
    ELSE 0
  END;

-- Display created test data summary
SELECT 'Test Data Created:' as status
UNION ALL
SELECT '- Clients: ' || COUNT(*)::text FROM public.clients WHERE pin IN ('111111', '222222', '333333', '444444')
UNION ALL
SELECT '- Assistants: ' || COUNT(*)::text FROM public.client_assistants WHERE vapi_assistant_id LIKE 'vapi-%'
UNION ALL
SELECT '- Phone Numbers: ' || COUNT(*)::text FROM public.client_phone_numbers WHERE vapi_phone_id LIKE 'vapi-phone-%'
UNION ALL
SELECT '- Call Logs: ' || COUNT(*)::text FROM public.call_logs WHERE vapi_call_id LIKE 'vapi-call-%'
UNION ALL
SELECT '- Analytics Records: ' || COUNT(*)::text FROM public.call_analytics;

-- Show sample PINs for testing
SELECT 
  pin,
  company_name,
  contact_email,
  (SELECT COUNT(*) FROM public.client_assistants WHERE client_id = c.id) as assistant_count,
  (SELECT COUNT(*) FROM public.client_phone_numbers WHERE client_id = c.id) as phone_count
FROM public.clients c
WHERE pin IN ('111111', '222222', '333333', '444444')
ORDER BY pin;