-- Fix for Make.com call logging trigger error
-- This fixes the auto_track_usage_on_call trigger that's causing the error

-- Check if the trigger function exists and fix it
CREATE OR REPLACE FUNCTION public.auto_track_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only process if we have a duration
  IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds > 0 THEN
    BEGIN
      -- Call the tracking function
      v_result := public.track_call_usage(
        NEW.assistant_id,
        NEW.duration_seconds,
        NEW.id
      );
      
      -- Log result if tracking failed
      IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
        RAISE WARNING 'Failed to track usage for call %: %', NEW.id, v_result->>'error';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Error in auto_track_usage_on_call: %', SQLERRM;
    END;
  END IF;
  
  -- ALWAYS return NEW - this is critical!
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: If you want to temporarily disable usage tracking entirely
-- You can replace the function with a simple stub:
/*
CREATE OR REPLACE FUNCTION public.auto_track_usage_on_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Usage tracking disabled - just return NEW
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- Check what triggers exist on call_logs table
SELECT 
  tgname as trigger_name,
  tgtype,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.call_logs'::regclass
ORDER BY tgname;