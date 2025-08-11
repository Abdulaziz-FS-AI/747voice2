-- Fix the trigger function to use duration_seconds
-- (Assuming the column has already been manually renamed to duration_seconds)

-- =============================================
-- Update the trigger function to reference duration_seconds
-- =============================================
CREATE OR REPLACE FUNCTION update_user_usage_on_call_safe()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  target_assistant_id uuid;
BEGIN
  -- Get the user_id from assistant
  SELECT ua.user_id, ua.id INTO target_user_id, target_assistant_id
  FROM public.user_assistants ua
  WHERE ua.id = NEW.assistant_id;
  
  -- Skip if assistant not found
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Only update usage if duration > 0
  IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds > 0 THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Recreate the trigger with the correct column name
-- =============================================
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

CREATE TRIGGER call_usage_update_trigger
  AFTER INSERT OR UPDATE OF duration_seconds, evaluation ON public.call_info_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call_safe();

-- =============================================
-- Verify the column exists
-- =============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'duration_seconds';

-- Should show 'duration_seconds' column