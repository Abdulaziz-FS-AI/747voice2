-- Fix the trigger function to handle TEXT assistant_id correctly
-- The issue: assistant_id in call_info_log is TEXT (VAPI ID), not UUID

-- =============================================
-- Update the trigger function to handle TEXT to UUID comparison
-- =============================================
CREATE OR REPLACE FUNCTION update_user_usage_on_call_safe()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  target_assistant_id uuid;
BEGIN
  -- First try to match by VAPI assistant ID (TEXT to TEXT comparison)
  SELECT ua.user_id, ua.id INTO target_user_id, target_assistant_id
  FROM public.user_assistants ua
  WHERE ua.vapi_assistant_id = NEW.assistant_id;
  
  -- If not found by VAPI ID, try to cast and match by internal ID
  IF target_user_id IS NULL THEN
    -- Only try UUID cast if the string looks like a UUID
    IF NEW.assistant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT ua.user_id, ua.id INTO target_user_id, target_assistant_id
      FROM public.user_assistants ua
      WHERE ua.id = NEW.assistant_id::uuid;
    END IF;
  END IF;
  
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
-- Test the function with sample data
-- =============================================
-- Check what type of assistant_id values we have
SELECT 
    assistant_id,
    LENGTH(assistant_id) as id_length,
    assistant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' as is_uuid_format
FROM public.call_info_log 
LIMIT 5;

-- Check assistant IDs in user_assistants
SELECT 
    id,
    vapi_assistant_id,
    name
FROM public.user_assistants
LIMIT 5;