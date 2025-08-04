-- TEST SCRIPT FOR VOICE MATRIX DATABASE FIXES
-- Run this after applying CRITICAL_FIXES.sql to verify everything works

-- =============================================================================
-- TEST 1: Verify subscription_events table exists and works
-- =============================================================================
DO $$
BEGIN
  -- Test insert into subscription_events
  INSERT INTO public.subscription_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, -- Dummy UUID for test
    'test_event',
    jsonb_build_object('test', true, 'timestamp', now())
  );
  
  RAISE NOTICE '✅ subscription_events table works correctly';
  
  -- Clean up test data
  DELETE FROM public.subscription_events WHERE event_type = 'test_event';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ subscription_events test failed: %', SQLERRM;
END $$;

-- =============================================================================
-- TEST 2: Test track_call_usage function
-- =============================================================================
DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  test_assistant_id uuid;
  result jsonb;
BEGIN
  -- Create test profile
  INSERT INTO public.profiles (
    id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants
  ) VALUES (
    test_user_id, 'test@example.com', 'Test User', 0, 10, 3
  ) ON CONFLICT (id) DO UPDATE SET 
    current_usage_minutes = 0,
    max_minutes_monthly = 10;

  -- Create test assistant
  INSERT INTO public.user_assistants (
    user_id, name, personality
  ) VALUES (
    test_user_id, 'Test Assistant', 'helpful'
  ) RETURNING id INTO test_assistant_id;

  -- Test the function
  SELECT public.track_call_usage(test_assistant_id, 65, null) INTO result; -- 65 seconds = 2 minutes
  
  IF (result->>'success')::boolean THEN
    RAISE NOTICE '✅ track_call_usage function works correctly';
    RAISE NOTICE 'Result: %', result;
  ELSE
    RAISE WARNING '❌ track_call_usage function failed: %', result->>'error';
  END IF;

  -- Clean up test data
  DELETE FROM public.user_assistants WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  DELETE FROM public.subscription_events WHERE user_id = test_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ track_call_usage test failed: %', SQLERRM;
    -- Clean up on error
    DELETE FROM public.user_assistants WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.subscription_events WHERE user_id = test_user_id;
END $$;

-- =============================================================================
-- TEST 3: Test call_logs triggers
-- =============================================================================
DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  test_assistant_id uuid;
  test_call_id uuid;
  profile_usage numeric;
BEGIN
  -- Create test profile
  INSERT INTO public.profiles (
    id, email, full_name, current_usage_minutes, max_minutes_monthly
  ) VALUES (
    test_user_id, 'test2@example.com', 'Test User 2', 0, 10
  ) ON CONFLICT (id) DO UPDATE SET current_usage_minutes = 0;

  -- Create test assistant
  INSERT INTO public.user_assistants (
    user_id, name, personality
  ) VALUES (
    test_user_id, 'Test Assistant 2', 'helpful'
  ) RETURNING id INTO test_assistant_id;

  -- Insert call log to trigger usage tracking
  INSERT INTO public.call_logs (
    assistant_id, duration_seconds, cost, caller_number, started_at
  ) VALUES (
    test_assistant_id, 120, 0.50, '+1234567890', now()
  ) RETURNING id INTO test_call_id;

  -- Wait a moment for triggers to execute
  PERFORM pg_sleep(0.1);

  -- Check if usage was tracked
  SELECT current_usage_minutes INTO profile_usage
  FROM public.profiles
  WHERE id = test_user_id;

  IF profile_usage >= 2 THEN
    RAISE NOTICE '✅ Call logs triggers work correctly - Usage tracked: % minutes', profile_usage;
  ELSE
    RAISE WARNING '❌ Call logs triggers failed - Usage not tracked properly: % minutes', profile_usage;
  END IF;

  -- Clean up test data
  DELETE FROM public.call_logs WHERE id = test_call_id;
  DELETE FROM public.user_assistants WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  DELETE FROM public.subscription_events WHERE user_id = test_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Call logs trigger test failed: %', SQLERRM;
    -- Clean up on error
    DELETE FROM public.call_logs WHERE assistant_id = test_assistant_id;
    DELETE FROM public.user_assistants WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.subscription_events WHERE user_id = test_user_id;
END $$;

-- =============================================================================
-- TEST 4: Verify foreign key constraints
-- =============================================================================
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  -- Check if foreign key constraint exists with proper ON DELETE
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'call_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule = 'CASCADE'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✅ Foreign key constraints are properly configured';
  ELSE
    RAISE WARNING '❌ Foreign key constraints may not have proper CASCADE rules';
  END IF;
END $$;

-- =============================================================================
-- TEST 5: Test usage limit enforcement
-- =============================================================================
DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000003'::uuid;
  test_assistant_id uuid;
  result jsonb;
  assistant_disabled boolean;
BEGIN
  -- Create test profile
  INSERT INTO public.profiles (
    id, email, full_name, current_usage_minutes, max_minutes_monthly
  ) VALUES (
    test_user_id, 'test3@example.com', 'Test User 3', 8, 10 -- Already close to limit
  ) ON CONFLICT (id) DO UPDATE SET 
    current_usage_minutes = 8,
    max_minutes_monthly = 10;

  -- Create test assistant
  INSERT INTO public.user_assistants (
    user_id, name, personality, is_disabled
  ) VALUES (
    test_user_id, 'Test Assistant 3', 'helpful', false
  ) RETURNING id INTO test_assistant_id;

  -- Track usage that exceeds limit (8 + 3 = 11 > 10)
  SELECT public.track_call_usage(test_assistant_id, 180, null) INTO result; -- 180 seconds = 3 minutes
  
  -- Check if assistant was disabled
  SELECT is_disabled INTO assistant_disabled
  FROM public.user_assistants
  WHERE id = test_assistant_id;

  IF assistant_disabled THEN
    RAISE NOTICE '✅ Usage limit enforcement works correctly - Assistant disabled';
  ELSE
    RAISE WARNING '❌ Usage limit enforcement failed - Assistant not disabled';
  END IF;

  -- Clean up test data
  DELETE FROM public.user_assistants WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  DELETE FROM public.subscription_events WHERE user_id = test_user_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Usage limit enforcement test failed: %', SQLERRM;
    -- Clean up on error
    DELETE FROM public.user_assistants WHERE user_id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
    DELETE FROM public.subscription_events WHERE user_id = test_user_id;
END $$;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
SELECT 
  'Database Fix Tests Completed' as status,
  now() as timestamp,
  'Check output above for individual test results' as instructions;

-- Verify critical tables exist
SELECT 
  expected_tables.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('profiles'),
    ('user_assistants'),
    ('call_logs'),
    ('subscription_events'),
    ('templates'),
    ('structured_questions'),
    ('user_phone_numbers')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t ON t.table_name = expected_tables.table_name 
  AND t.table_schema = 'public'
ORDER BY expected_tables.table_name;

-- Verify critical functions exist
SELECT 
  expected_functions.routine_name,
  CASE WHEN r.routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('track_call_usage'),
    ('auto_track_usage_on_call'),
    ('update_call_log_user_id'),
    ('ensure_user_profile'),
    ('handle_new_user')
) AS expected_functions(routine_name)
LEFT JOIN information_schema.routines r ON r.routine_name = expected_functions.routine_name
  AND r.routine_schema = 'public'
ORDER BY expected_functions.routine_name;

-- Verify triggers exist
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name LIKE '%call%' OR trigger_name LIKE '%usage%'
ORDER BY trigger_name;