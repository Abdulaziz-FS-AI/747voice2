-- SIMPLE STEP-BY-STEP DIAGNOSTIC
-- Run each query separately to see what exists

-- =============================================
-- STEP 1: Check if call_info_log table exists
-- =============================================
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'call_info_log'
) as table_exists;

-- =============================================
-- STEP 2: Show call_info_log structure
-- =============================================
\d public.call_info_log;

-- =============================================
-- STEP 3: Check triggers on call_info_log
-- =============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- =============================================
-- STEP 4: List all public schema tables
-- =============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =============================================
-- STEP 5: Check current user and permissions
-- =============================================
SELECT current_user, current_database(), current_schema();

-- =============================================
-- STEP 6: Simple function check
-- =============================================
SELECT proname 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LIMIT 10;