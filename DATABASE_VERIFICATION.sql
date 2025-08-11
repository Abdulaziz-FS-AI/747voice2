-- DATABASE VERIFICATION SCRIPT
-- Run this to verify your Make.com integration is ready

-- =============================================
-- 1. CHECK TRIGGERS (MOST CRITICAL)
-- =============================================
SELECT 
    '=== TRIGGER CHECK ===' as section,
    CASE 
        WHEN COUNT(*) = 1 AND MAX(trigger_name) = 'call_usage_update_trigger' 
        THEN '✅ TRIGGERS CORRECT - Ready for production'
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_call_log_inserted' AND event_object_table = 'call_info_log')
        THEN '❌ CRITICAL ERROR - Problematic trigger still exists! Apply FINAL_TRIGGER_FIX.sql immediately!'
        ELSE '⚠️ WARNING - Unexpected trigger configuration'
    END as status
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- Show actual triggers
SELECT 
    trigger_name,
    action_statement,
    CASE 
        WHEN trigger_name = 'on_call_log_inserted' THEN '❌ REMOVE THIS - Causes UUID = TEXT error'
        WHEN trigger_name = 'call_usage_update_trigger' THEN '✅ KEEP THIS - Works correctly'
        ELSE '⚠️ Unknown trigger'
    END as action_required
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- =============================================
-- 2. CHECK TABLE STRUCTURE
-- =============================================
SELECT 
    '=== TABLE STRUCTURE CHECK ===' as section,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'assistant_id' AND data_type = 'text' THEN '✅ Correct - TEXT for VAPI IDs'
        WHEN column_name = 'assistant_id' AND data_type = 'uuid' THEN '❌ Wrong - Should be TEXT not UUID'
        WHEN column_name = 'duration_minutes' THEN '✅ Correct field name'
        WHEN column_name = 'evaluation' THEN '✅ Correct - Flexible evaluation field'
        ELSE '✓ Standard field'
    END as status
FROM information_schema.columns 
WHERE table_name = 'call_info_log'
ORDER BY ordinal_position;

-- =============================================
-- 3. CHECK USER_ASSISTANTS TABLE
-- =============================================
SELECT 
    '=== USER_ASSISTANTS CHECK ===' as section,
    COUNT(*) as total_assistants,
    COUNT(DISTINCT vapi_assistant_id) as unique_vapi_ids,
    COUNT(DISTINCT user_id) as total_users,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Assistants exist'
        ELSE '⚠️ No assistants found - create some first'
    END as status
FROM user_assistants;

-- Check for the specific assistant from Make.com errors
SELECT 
    '=== SPECIFIC ASSISTANT CHECK ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_assistants 
            WHERE vapi_assistant_id = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc'
        ) THEN '✅ Test assistant exists'
        ELSE '⚠️ Test assistant not found - may need to create it'
    END as status;

-- =============================================
-- 4. CHECK RECENT CALL DATA
-- =============================================
SELECT 
    '=== RECENT CALLS CHECK ===' as section,
    COUNT(*) as total_calls_last_24h,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Recent calls exist'
        ELSE '⚠️ No recent calls - webhook may not be working'
    END as status
FROM call_info_log
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Show last 5 calls for debugging
SELECT 
    '=== LAST 5 CALLS ===' as section,
    id,
    assistant_id,
    duration_minutes,
    evaluation,
    created_at
FROM call_info_log
ORDER BY created_at DESC
LIMIT 5;

-- =============================================
-- 5. CHECK FOREIGN KEY CONSTRAINTS
-- =============================================
SELECT 
    '=== FOREIGN KEY CHECK ===' as section,
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM (
    SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'call_info_log'
) fk_info;

-- =============================================
-- 6. FINAL READINESS CHECK
-- =============================================
SELECT 
    '=== FINAL READINESS VERDICT ===' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_call_log_inserted' 
            AND event_object_table = 'call_info_log'
        ) THEN '🔴 NOT READY - Critical trigger issue! Apply FINAL_TRIGGER_FIX.sql'
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = 'call_info_log'
        ) THEN '🟡 WARNING - No triggers found, usage tracking may not work'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'call_usage_update_trigger' 
            AND event_object_table = 'call_info_log'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_call_log_inserted' 
            AND event_object_table = 'call_info_log'
        ) THEN '🟢 DATABASE READY - Triggers configured correctly'
        ELSE '🟡 UNKNOWN STATE - Manual review needed'
    END as database_status,
    '⚠️ Remember to also set MAKE_WEBHOOK_SECRET environment variable!' as reminder;

-- =============================================
-- END OF VERIFICATION
-- =============================================
SELECT 'Verification complete. Check results above.' as message;