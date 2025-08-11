-- Migration: Change duration from minutes to seconds
-- This makes the system more intuitive and eliminates conversion errors

-- =============================================
-- STEP 1: Rename the column from duration_minutes to duration_seconds
-- =============================================
ALTER TABLE public.call_info_log 
RENAME COLUMN duration_minutes TO duration_seconds;

-- =============================================
-- STEP 2: Convert existing data from minutes to seconds
-- =============================================
-- If you have existing data in minutes, multiply by 60 to convert to seconds
UPDATE public.call_info_log 
SET duration_seconds = duration_seconds * 60
WHERE duration_seconds IS NOT NULL;

-- =============================================
-- STEP 3: Update any functions that reference duration_minutes
-- =============================================
-- Check for functions that might use the old column name
CREATE OR REPLACE FUNCTION update_user_usage_on_call_safe()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  target_assistant_id uuid;
BEGIN
  -- Get the user_id from assistant
  SELECT ua.user_id, ua.id INTO target_user_id, target_assistant_id
  FROM public.user_assistants ua
  WHERE ua.vapi_assistant_id = NEW.assistant_id;
  
  -- Skip if assistant not found
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update assistant usage (convert seconds to minutes for usage tracking)
  UPDATE public.user_assistants
  SET 
    usage_minutes = usage_minutes + (NEW.duration_seconds / 60.0),
    updated_at = now()
  WHERE id = target_assistant_id;
  
  -- Update user total usage (convert seconds to minutes for usage tracking)
  UPDATE public.profiles
  SET 
    current_usage_minutes = current_usage_minutes + (NEW.duration_seconds / 60.0),
    updated_at = now()
  WHERE id = target_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Update trigger to use new column name
-- =============================================
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

CREATE TRIGGER call_usage_update_trigger
  AFTER INSERT OR UPDATE OF duration_seconds, evaluation ON public.call_info_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call_safe();

-- =============================================
-- STEP 5: Verify the changes
-- =============================================
-- Check that the column has been renamed
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name IN ('duration_minutes', 'duration_seconds');

-- Should only show 'duration_seconds' now

-- =============================================
-- STEP 6: Test with sample data
-- =============================================
-- Insert a test record with duration in seconds
INSERT INTO public.call_info_log (
    assistant_id,
    vapi_call_id,
    duration_seconds,  -- Now in seconds!
    evaluation,
    started_at
) VALUES (
    (SELECT id FROM user_assistants LIMIT 1),
    'test-seconds-' || gen_random_uuid(),
    90,  -- 90 seconds (1.5 minutes)
    'test',
    NOW()
);

-- Verify it's stored correctly
SELECT 
    vapi_call_id,
    duration_seconds,
    duration_seconds / 60.0 as duration_minutes
FROM public.call_info_log 
WHERE vapi_call_id LIKE 'test-seconds-%';

-- Clean up test data
DELETE FROM public.call_info_log WHERE vapi_call_id LIKE 'test-seconds-%';

-- =============================================
-- DONE! The column is now duration_seconds
-- =============================================
-- Remember to update your application code:
-- 1. Webhook should store payload.duration_seconds directly (no division)
-- 2. Analytics should use duration_seconds field
-- 3. Cost calculations should use (duration_seconds / 60) * cost_per_minute