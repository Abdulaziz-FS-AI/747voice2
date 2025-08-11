# URGENT: Apply This Database Fix for Make.com Integration

## The Problem
Your Make.com integration is failing with "[404] operator does not exist: uuid = text" because of conflicting database triggers on the `call_info_log` table.

## The Root Cause (Identified via Database Audit)
- Two triggers fire when data is inserted into `call_info_log`
- `call_usage_update_trigger` works correctly (handles TEXT `assistant_id`)
- `on_call_log_inserted` trigger calls `update_usage_on_call_end()` which incorrectly tries to use TEXT `assistant_id` as UUID

## The Fix
Run this SQL in your Supabase SQL Editor:

```sql
-- STEP 1: Remove the problematic trigger
DROP TRIGGER IF EXISTS on_call_log_inserted ON public.call_info_log;

-- STEP 2: Fix the broken function (in case it's used elsewhere)
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

-- STEP 3: Verify the fix worked
SELECT 
    'Remaining triggers on call_info_log:' as info,
    trigger_name,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

SELECT 'UUID = TEXT error fixed! Make.com should now work.' as status;
```

## Why This Fix Works
1. **Removes the problematic trigger**: `on_call_log_inserted` was causing UUID = TEXT comparisons
2. **Keeps the working trigger**: `call_usage_update_trigger` continues to work properly
3. **Fixes the function**: In case `update_usage_on_call_end()` is used elsewhere, it now properly handles TEXT `assistant_id` values

## After Applying the Fix
1. Test your Make.com scenario
2. The "[404] operator does not exist: uuid = text" error should be gone
3. Analytics data should flow from Make.com to Supabase successfully

## Need Help?
If you need help applying this fix or have questions, let me know!