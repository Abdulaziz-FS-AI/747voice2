-- FIX UUID = TEXT OPERATOR ERROR
-- Check actual data types and fix the mismatch

-- =============================================
-- STEP 1: Check actual data types in both tables
-- =============================================
SELECT 
    'call_info_log.assistant_id type:' as info,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'assistant_id';

SELECT 
    'user_assistants.vapi_assistant_id type:' as info,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_assistants' 
  AND column_name = 'vapi_assistant_id';

-- =============================================
-- STEP 2: Fix the calculate_monthly_usage function with explicit casting
-- =============================================

CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month with explicit type casting
  SELECT COALESCE(SUM(cil.duration_minutes), 0)
  INTO total_minutes
  FROM public.call_info_log cil
  JOIN public.user_assistants ua ON cil.assistant_id::text = ua.vapi_assistant_id::text
  WHERE ua.user_id = user_uuid
    AND cil.created_at >= start_of_month;
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 3: Alternative - Check if assistant_id is actually UUID in call_info_log
-- =============================================

-- If assistant_id is UUID type but contains VAPI IDs, we need to handle conversion
CREATE OR REPLACE FUNCTION calculate_monthly_usage_safe(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Handle both cases: assistant_id as UUID or TEXT
  BEGIN
    -- Try UUID comparison first (if assistant_id contains internal UUIDs)
    SELECT COALESCE(SUM(cil.duration_minutes), 0)
    INTO total_minutes
    FROM public.call_info_log cil
    JOIN public.user_assistants ua ON cil.assistant_id::uuid = ua.id
    WHERE ua.user_id = user_uuid
      AND cil.created_at >= start_of_month;
  EXCEPTION WHEN others THEN
    -- Fallback to TEXT comparison (if assistant_id contains VAPI IDs)
    SELECT COALESCE(SUM(cil.duration_minutes), 0)
    INTO total_minutes
    FROM public.call_info_log cil
    JOIN public.user_assistants ua ON cil.assistant_id::text = ua.vapi_assistant_id
    WHERE ua.user_id = user_uuid
      AND cil.created_at >= start_of_month;
  END;
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 4: Update get_user_from_assistant with better error handling
-- =============================================

CREATE OR REPLACE FUNCTION get_user_from_assistant_safe(assistant_id_param text)
RETURNS uuid AS $$
DECLARE
  result_user_id uuid;
BEGIN
  -- First try to find by VAPI assistant ID
  SELECT user_id INTO result_user_id
  FROM public.user_assistants 
  WHERE vapi_assistant_id = assistant_id_param
  LIMIT 1;
  
  -- If not found and the param looks like a UUID, try internal ID lookup
  IF result_user_id IS NULL AND assistant_id_param ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    BEGIN
      SELECT user_id INTO result_user_id
      FROM public.user_assistants 
      WHERE id = assistant_id_param::uuid
      LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Not a valid UUID, ignore
      NULL;
    END;
  END IF;
  
  RETURN result_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 5: Test which approach works with your data
-- =============================================

-- Test 1: Check what's actually in call_info_log.assistant_id
SELECT 
    'Sample call_info_log.assistant_id values:' as test,
    assistant_id,
    length(assistant_id) as id_length,
    CASE 
        WHEN assistant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
        ELSE 'Not UUID format'
    END as format_type
FROM public.call_info_log 
WHERE assistant_id IS NOT NULL
LIMIT 5;

-- Test 2: Check what's in user_assistants
SELECT 
    'Sample user_assistants data:' as test,
    id as internal_id,
    vapi_assistant_id,
    CASE 
        WHEN vapi_assistant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID format'
        ELSE 'Not UUID format'
    END as vapi_id_format
FROM public.user_assistants 
WHERE vapi_assistant_id IS NOT NULL
LIMIT 5;

-- =============================================
-- STEP 6: Based on test results, use the correct function
-- =============================================

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- Use the safe function that handles both cases
CREATE OR REPLACE FUNCTION update_user_usage_on_call_safe()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
BEGIN
  -- Use the safe lookup function
  target_user_id := get_user_from_assistant_safe(NEW.assistant_id);
  
  -- Skip if assistant not found
  IF target_user_id IS NULL THEN
    RAISE WARNING 'Assistant not found for ID: %', NEW.assistant_id;
    RETURN NEW;
  END IF;
  
  -- Only update if call has duration
  IF NEW.duration_minutes > 0 THEN
    -- Use the safe calculation function
    new_usage := calculate_monthly_usage_safe(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with safe function
CREATE TRIGGER call_usage_update_trigger
    AFTER INSERT OR UPDATE ON public.call_info_log
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage_on_call_safe();

SELECT 'Type-safe functions created! Check the test results above to see what data format you actually have.' as status;