-- FIX DATABASE FUNCTIONS TO WORK WITH VAPI ASSISTANT IDs
-- Update functions to accept VAPI assistant IDs instead of internal UUIDs

-- =============================================
-- STEP 1: Update get_user_from_assistant to work with VAPI IDs
-- =============================================

-- Drop the old function that expects UUID
DROP FUNCTION IF EXISTS get_user_from_assistant(uuid);

-- Create new function that works with VAPI assistant ID (TEXT)
CREATE OR REPLACE FUNCTION get_user_from_assistant(vapi_assistant_id_param text)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE vapi_assistant_id = vapi_assistant_id_param
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 2: Update calculate_monthly_usage to work with VAPI IDs
-- =============================================

CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month using VAPI assistant_id join
  SELECT COALESCE(SUM(cil.duration_minutes), 0)
  INTO total_minutes
  FROM public.call_info_log cil
  JOIN public.user_assistants ua ON cil.assistant_id = ua.vapi_assistant_id
  WHERE ua.user_id = user_uuid
    AND cil.created_at >= start_of_month;
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 3: Update usage tracking trigger function
-- =============================================

CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  evaluation_text TEXT;
BEGIN
  -- Get user_id from VAPI assistant ID
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Skip if assistant not found
  IF target_user_id IS NULL THEN
    RAISE WARNING 'Assistant not found for VAPI ID: %', NEW.assistant_id;
    RETURN NEW;
  END IF;
  
  -- Convert evaluation to text for comparison (handles any data type)
  evaluation_text := COALESCE(NEW.evaluation::TEXT, '');
  
  -- Only update if call seems successful and has duration
  IF NEW.duration_minutes > 0 AND (
    evaluation_text ILIKE '%good%' OR 
    evaluation_text ILIKE '%excellent%' OR
    evaluation_text ILIKE '%completed%' OR
    evaluation_text ILIKE '%success%' OR
    evaluation_text IN ('0', '1', 'true', 'TRUE') OR
    evaluation_text = 'average'
  ) THEN
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
          'evaluation_text', evaluation_text,
          'new_total_minutes', new_usage,
          'vapi_assistant_id', NEW.assistant_id
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

-- =============================================
-- STEP 4: Update can_user_make_call function
-- =============================================

CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_limits RECORD;
  current_usage NUMERIC;
  assistant_count INTEGER;
  result jsonb;
BEGIN
  -- Get user limits and current usage
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
  
  -- Build result
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

-- =============================================
-- STEP 5: Drop and recreate the trigger
-- =============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- Recreate trigger with updated function
CREATE TRIGGER call_usage_update_trigger
    AFTER INSERT OR UPDATE OF duration_minutes, evaluation ON public.call_info_log
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage_on_call();

-- =============================================
-- STEP 6: Test the functions
-- =============================================

-- Test get_user_from_assistant function
DO $$
DECLARE
    test_vapi_id text;
    test_user_id uuid;
BEGIN
    -- Get a sample VAPI assistant ID from your data
    SELECT vapi_assistant_id INTO test_vapi_id
    FROM public.user_assistants 
    WHERE vapi_assistant_id IS NOT NULL 
    LIMIT 1;
    
    IF test_vapi_id IS NOT NULL THEN
        test_user_id := get_user_from_assistant(test_vapi_id);
        RAISE NOTICE 'Test: VAPI ID % maps to user %', test_vapi_id, test_user_id;
    ELSE
        RAISE NOTICE 'No VAPI assistant IDs found to test with';
    END IF;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that functions exist with correct signatures
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN ('get_user_from_assistant', 'calculate_monthly_usage', 'update_user_usage_on_call', 'can_user_make_call')
ORDER BY proname;

SELECT 'Database functions updated for VAPI assistant IDs! ✅' as status;