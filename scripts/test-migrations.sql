-- Test script to verify all migrations are correct
-- Run this after applying all migrations to test functionality

-- Test 1: Create a test client
INSERT INTO public.clients (pin, company_name, contact_email, notes)
VALUES ('123456', 'Test Company', 'test@example.com', 'Test client for migration verification')
RETURNING id, pin, company_name;

-- Store the client ID for subsequent tests (replace with actual ID from above)
-- Example: SET @client_id = 'actual-uuid-here';

-- Test 2: Create a test assistant for the client
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
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
  tc.id,
  'test-vapi-assistant-001',
  'Test Assistant',
  'Hello, how can I help you today?',
  'en-US-Standard-A',
  'gpt-4',
  'contains',
  600,
  'You are a helpful assistant.',
  '[{"question": "What is your name?", "answer": "Test Assistant"}]'::jsonb
FROM test_client tc
RETURNING id, vapi_assistant_id, display_name;

-- Test 3: Create a test phone number
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
),
test_assistant AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'test-vapi-assistant-001' LIMIT 1
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
  'test-vapi-phone-001',
  '+1234567890',
  'Test Phone Number',
  ta.id
FROM test_client tc, test_assistant ta
RETURNING id, vapi_phone_id, phone_number;

-- Test 4: Test PIN authentication
SELECT * FROM public.authenticate_pin('123456', '127.0.0.1', 'Test User Agent');

-- Test 5: Test session validation (use the session token from Test 4)
-- Example: SELECT * FROM public.validate_session('session-token-from-test-4');

-- Test 6: Test getting client assistants
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.get_client_assistants(
  (SELECT id FROM test_client)
);

-- Test 7: Test getting client phone numbers
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.get_client_phone_numbers(
  (SELECT id FROM test_client)
);

-- Test 8: Test updating an assistant
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
),
test_assistant AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'test-vapi-assistant-001' LIMIT 1
)
SELECT * FROM public.update_assistant(
  (SELECT id FROM test_assistant),
  (SELECT id FROM test_client),
  'Updated Test Assistant',
  'Updated greeting message',
  'en-US-Standard-B',
  'gpt-3.5-turbo',
  'exact',
  300
);

-- Test 9: Create a test call log
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
),
test_assistant AS (
  SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'test-vapi-assistant-001' LIMIT 1
),
test_phone AS (
  SELECT id FROM public.client_phone_numbers WHERE vapi_phone_id = 'test-vapi-phone-001' LIMIT 1
)
INSERT INTO public.call_logs (
  client_id,
  assistant_id,
  phone_number_id,
  vapi_call_id,
  caller_number,
  duration_seconds,
  cost,
  call_status,
  call_type,
  success_evaluation,
  assistant_display_name
)
SELECT 
  tc.id,
  ta.id,
  tp.id,
  'test-vapi-call-001',
  '+9876543210',
  180,
  0.50,
  'completed',
  'inbound',
  true,
  'Test Assistant'
FROM test_client tc, test_assistant ta, test_phone tp
RETURNING id, vapi_call_id, duration_seconds;

-- Test 10: Test analytics functions
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.get_dashboard_analytics(
  (SELECT id FROM test_client),
  30
);

-- Test 11: Test recent calls
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.get_recent_calls(
  (SELECT id FROM test_client),
  10
);

-- Test 12: Test client usage
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.get_client_usage(
  (SELECT id FROM test_client),
  NULL,
  NULL
);

-- Test 13: Test PIN change
WITH test_client AS (
  SELECT id FROM public.clients WHERE pin = '123456' LIMIT 1
)
SELECT * FROM public.change_pin(
  (SELECT id FROM test_client),
  '123456',
  '654321',
  'test@example.com'
);

-- Test 14: Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test 15: Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test 16: Verify all functions exist
SELECT 
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Cleanup: Remove test data
DELETE FROM public.call_logs WHERE vapi_call_id = 'test-vapi-call-001';
DELETE FROM public.client_phone_numbers WHERE vapi_phone_id = 'test-vapi-phone-001';
DELETE FROM public.client_assistants WHERE vapi_assistant_id = 'test-vapi-assistant-001';
DELETE FROM public.clients WHERE pin IN ('123456', '654321');

-- Final verification
SELECT 'All migration tests completed successfully!' as result;