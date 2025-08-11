-- FINAL FIX: Remove the conflicting trigger causing UUID = TEXT error
-- Based on the audit results

-- =============================================
-- STEP 1: Drop the problematic trigger
-- =============================================
-- This trigger calls update_usage_on_call_end() which has UUID = TEXT comparison
DROP TRIGGER IF EXISTS on_call_log_inserted ON public.call_info_log;

-- =============================================
-- STEP 2: Keep only the working trigger
-- =============================================
-- The call_usage_update_trigger with update_user_usage_on_call_safe() is fine
-- It properly handles TEXT assistant_id values

-- =============================================
-- STEP 3: Also fix the broken function (in case it's used elsewhere)
-- =============================================
-- The update_usage_on_call_end function tries to use NEW.assistant_id as UUID
-- But call_info_log.assistant_id is TEXT containing VAPI assistant IDs

CREATE OR REPLACE FUNCTION update_usage_on_call_end()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id uuid;
    target_assistant_id uuid;
BEGIN
    -- Get the user_id and internal assistant_id from the VAPI assistant ID
    SELECT ua.user_id, ua.id 
    INTO target_user_id, target_assistant_id
    FROM public.user_assistants ua
    WHERE ua.vapi_assistant_id = NEW.assistant_id;
    
    -- Skip if assistant not found
    IF target_user_id IS NULL THEN
        RAISE WARNING 'Assistant not found for VAPI ID: %', NEW.assistant_id;
        RETURN NEW;
    END IF;
    
    -- Update assistant usage (using internal UUID)
    UPDATE public.user_assistants
    SET 
        usage_minutes = usage_minutes + NEW.duration_minutes,
        updated_at = now()
    WHERE id = target_assistant_id;
    
    -- Update user total usage
    UPDATE public.profiles
    SET 
        current_usage_minutes = current_usage_minutes + NEW.duration_minutes,
        updated_at = now()
    WHERE id = target_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Verify only one trigger remains
-- =============================================
SELECT 
    'Remaining triggers on call_info_log:' as info,
    trigger_name,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- Should only show call_usage_update_trigger now

SELECT 'UUID = TEXT error fixed! Make.com should now work.' as status;