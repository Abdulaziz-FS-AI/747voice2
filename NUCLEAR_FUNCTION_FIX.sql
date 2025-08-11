-- NUCLEAR OPTION: Drop all problematic functions and recreate minimal versions
-- This avoids the UUID = TEXT error by removing all existing functions

-- =============================================
-- STEP 1: Drop ALL existing functions that might cause UUID = TEXT errors
-- =============================================

-- Drop all functions (multiple signatures)
DROP FUNCTION IF EXISTS get_user_from_assistant(uuid);
DROP FUNCTION IF EXISTS get_user_from_assistant(text);
DROP FUNCTION IF EXISTS get_user_from_assistant_safe(text);
DROP FUNCTION IF EXISTS calculate_monthly_usage(uuid);
DROP FUNCTION IF EXISTS calculate_monthly_usage_safe(uuid);
DROP FUNCTION IF EXISTS update_user_usage_on_call();
DROP FUNCTION IF EXISTS update_user_usage_on_call_safe();
DROP FUNCTION IF EXISTS can_user_make_call(uuid);
DROP FUNCTION IF EXISTS check_assistant_expiration();

-- =============================================
-- STEP 2: Drop all triggers on call_info_log
-- =============================================

DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;
DROP TRIGGER IF EXISTS on_usage_updated ON public.call_info_log;

-- =============================================
-- STEP 3: Test a simple insert to see if the basic constraint works
-- =============================================

-- This will tell us if the foreign key constraint is the problem
-- Don't actually insert, just prepare the statement to see if it would work

-- Check what the foreign key constraint currently points to
SELECT 
    'Current foreign key target:' as info,
    tc.constraint_name,
    kcu.column_name as source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    
    -- Show data types involved
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = tc.table_name AND column_name = kcu.column_name) as source_type,
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = ccu.table_name AND column_name = ccu.column_name) as target_type
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'call_info_log'
  AND kcu.column_name = 'assistant_id';

-- =============================================
-- STEP 4: Show sample data to understand the mismatch
-- =============================================

-- Show what's in call_info_log.assistant_id (if any data exists)
SELECT 
    'call_info_log.assistant_id sample:' as info,
    assistant_id,
    pg_typeof(assistant_id) as actual_type
FROM public.call_info_log 
LIMIT 3;

-- Show what's in user_assistants 
SELECT 
    'user_assistants sample:' as info,
    id as internal_id,
    pg_typeof(id) as id_type,
    vapi_assistant_id,
    pg_typeof(vapi_assistant_id) as vapi_id_type,
    name
FROM public.user_assistants 
LIMIT 3;

-- =============================================
-- STEP 5: Try to identify which VAPI assistant ID Make.com is sending
-- =============================================

-- Look for the specific assistant ID from your error message
SELECT 
    'Looking for 49f85a9a-dc4f-4b0a-98db-4068f09c9efc:' as search,
    id,
    vapi_assistant_id,
    name,
    'Found in vapi_assistant_id' as location
FROM public.user_assistants 
WHERE vapi_assistant_id = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc'

UNION ALL

SELECT 
    'Looking for 49f85a9a-dc4f-4b0a-98db-4068f09c9efc:' as search,
    id,
    vapi_assistant_id,
    name,
    'Found in id' as location
FROM public.user_assistants 
WHERE id::text = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc';

SELECT 'All problematic functions dropped. Run this to diagnose the data type issue.' as status;