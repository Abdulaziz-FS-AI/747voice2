-- =============================================
-- DATABASE VERIFICATION SCRIPT
-- =============================================
-- Run this to check if the fixes were applied
-- =============================================

-- 1. Check if user_phone_numbers table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_phone_numbers'
) as phone_table_exists;

-- 2. Check if assistant_state column exists and has correct values
SELECT 
    EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user_assistants' 
        AND column_name = 'assistant_state'
    ) as assistant_state_column_exists;

-- 3. Check current assistant states
SELECT 
    assistant_state,
    COUNT(*) as count
FROM public.user_assistants
GROUP BY assistant_state
ORDER BY count DESC;

-- 4. Check if old columns still exist
SELECT 
    column_name,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'user_assistants' 
AND column_name IN ('is_disabled', 'is_enabled', 'is_active')
ORDER BY column_name;

-- 5. Check user_phone_numbers table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_phone_numbers'
ORDER BY column_name;

-- 6. Check your specific assistant that was failing
SELECT 
    id,
    name,
    assistant_state,
    vapi_assistant_id,
    user_id,
    deleted_at,
    CASE 
        WHEN vapi_assistant_id IS NULL THEN '❌ No VAPI ID'
        WHEN vapi_assistant_id LIKE 'fallback_%' THEN '⚠️ Fallback ID'
        ELSE '✅ Valid VAPI ID'
    END as vapi_status
FROM public.user_assistants
WHERE id = 'd3ccc711-e0d9-47c0-9333-d042c0e52937'
   OR user_id = '8c2791ed-3366-4ddd-94cd-716bbf28bf85'
ORDER BY created_at DESC;

-- =============================================
-- EXPECTED RESULTS:
-- =============================================
-- 
-- 1. phone_table_exists should be TRUE
-- 2. assistant_state_column_exists should be TRUE  
-- 3. assistant_state should show mostly 'active'
-- 4. Old columns (is_disabled, etc.) should NOT exist
-- 5. user_phone_numbers should have all required columns
-- 6. Your specific assistant should show up with correct state
-- 
-- If any of these fail, the scripts didn't run properly!
-- =============================================