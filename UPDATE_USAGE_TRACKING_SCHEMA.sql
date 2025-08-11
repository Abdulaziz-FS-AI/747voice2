-- =============================================
-- UPDATE USAGE TRACKING FOR NEW CALL_LOGS SCHEMA
-- =============================================
-- This script updates all database functions and triggers to work with the new schema:
-- - No user_id in call_logs (use assistant_id join)
-- - duration_minutes instead of duration_seconds  
-- - evaluation instead of call_status
-- =============================================

-- 1. Drop existing trigger to prevent conflicts during schema changes
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- 2. Ensure helper function exists (get user_id from assistant_id)
CREATE OR REPLACE FUNCTION get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE id = assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Update calculate_monthly_usage function to use new schema
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month using assistant_id join
  SELECT COALESCE(SUM(cl.duration_minutes), 0)
  INTO total_minutes
  FROM public.call_info_log cl
  JOIN public.user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= start_of_month
    AND cl.evaluation IN ('excellent', 'good', 'average'); -- Only count successful calls
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Update usage tracking trigger function to use new schema
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
BEGIN
  -- Get user_id from assistant
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Only update if call is successful and has duration
  IF NEW.evaluation IN ('excellent', 'good', 'average') AND NEW.duration_minutes > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- Log the usage update for debugging (if audit_logs table exists)
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        action,
        details,
        created_at
      ) VALUES (
        target_user_id,
        'usage_updated',
        jsonb_build_object(
          'call_id', NEW.id,
          'call_duration_minutes', NEW.duration_minutes,
          'call_evaluation', NEW.evaluation,
          'new_total_minutes', new_usage
        ),
        now()
      );
    EXCEPTION WHEN undefined_table THEN
      -- audit_logs table doesn't exist, skip logging
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate trigger for new schema
CREATE TRIGGER call_usage_update_trigger
  BEFORE INSERT OR UPDATE OF duration_minutes, evaluation ON public.call_info_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- 6. Update monthly reset function to use new schema
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
BEGIN
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Reset usage for users whose reset date is before current month
  UPDATE public.profiles 
  SET 
    current_usage_minutes = calculate_monthly_usage(id),
    usage_reset_date = current_month_start,
    updated_at = now()
  WHERE usage_reset_date < current_month_start 
     OR usage_reset_date IS NULL;
     
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log the reset action (if audit_logs table exists)
  BEGIN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details,
      created_at
    ) 
    SELECT 
      id,
      'monthly_usage_reset',
      jsonb_build_object(
        'reset_date', current_month_start,
        'recalculated_usage', current_usage_minutes
      ),
      now()
    FROM public.profiles
    WHERE usage_reset_date = current_month_start;
  EXCEPTION WHEN undefined_table THEN
    -- audit_logs table doesn't exist, skip logging
    NULL;
  END;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update can_user_make_call function to use new schema
CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_limits RECORD;
  current_usage NUMERIC;
  assistant_count INTEGER;
  result jsonb;
BEGIN
  -- Get user limits and current usage (using correct column names from profiles table)
  SELECT 
    max_minutes_total,
    current_usage_minutes,
    max_assistants
  INTO user_limits
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Get current assistant count (only active assistants)
  SELECT COUNT(*)
  INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid 
    AND assistant_state = 'active';
  
  -- Recalculate current usage to ensure accuracy
  current_usage := calculate_monthly_usage(user_uuid);
  
  -- Build result (using correct column names)
  result := jsonb_build_object(
    'can_make_call', current_usage < user_limits.max_minutes_total,
    'can_create_assistant', assistant_count < user_limits.max_assistants,
    'usage', jsonb_build_object(
      'minutes_used', current_usage,
      'minutes_limit', user_limits.max_minutes_total,
      'minutes_remaining', GREATEST(0, user_limits.max_minutes_total - current_usage),
      'assistants_count', assistant_count,
      'assistants_limit', user_limits.max_assistants,
      'assistants_remaining', GREATEST(0, user_limits.max_assistants - assistant_count)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 8. Update indexes for new schema
DROP INDEX IF EXISTS idx_call_logs_duration_status;
CREATE INDEX IF NOT EXISTS idx_call_info_log_duration_evaluation ON public.call_info_log(duration_minutes, evaluation) 
  WHERE evaluation IN ('excellent', 'good', 'average');

-- 9. Verify the functions work correctly
DO $$ 
DECLARE
  test_result jsonb;
  test_user_id uuid;
BEGIN
  -- Test the updated function with a real user (if any exist)
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    test_result := can_user_make_call(test_user_id);
    RAISE NOTICE 'Test user % usage check: %', test_user_id, test_result;
  ELSE
    RAISE NOTICE 'No users found to test functions with';
  END IF;
END $$;

-- 10. Now recalculate all user usage based on new schema (after functions are created)
UPDATE public.profiles 
SET current_usage_minutes = calculate_monthly_usage(id);

-- 11. Final verification
SELECT 
  'Usage tracking update complete' as status,
  COUNT(*) as total_users,
  AVG(current_usage_minutes) as avg_usage_minutes
FROM public.profiles;