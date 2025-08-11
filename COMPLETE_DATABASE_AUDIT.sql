-- COMPLETE DATABASE AUDIT
-- Get all tables, triggers, functions, policies, and constraints

-- =============================================
-- 1. ALL TABLES AND THEIR COLUMNS
-- =============================================
SELECT 
    '=== TABLES AND COLUMNS ===' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =============================================
-- 2. ALL TRIGGERS
-- =============================================
SELECT 
    '=== TRIGGERS ===' as section,
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event_type,
    action_timing,
    action_statement as function_called
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =============================================
-- 3. ALL FUNCTIONS
-- =============================================
SELECT 
    '=== FUNCTIONS ===' as section,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as function_body
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- =============================================
-- 4. ALL RLS POLICIES
-- =============================================
SELECT 
    '=== RLS POLICIES ===' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================
-- 5. ALL CONSTRAINTS (FOREIGN KEYS, CHECKS, etc.)
-- =============================================
SELECT 
    '=== CONSTRAINTS ===' as section,
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name as source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    pg_get_constraintdef(pgc.oid) as constraint_definition
FROM 
    information_schema.table_constraints AS tc 
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN pg_constraint pgc 
      ON pgc.conname = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =============================================
-- 6. ALL INDEXES
-- =============================================
SELECT 
    '=== INDEXES ===' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =============================================
-- 7. TABLE PERMISSIONS
-- =============================================
SELECT 
    '=== TABLE PERMISSIONS ===' as section,
    table_schema,
    table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'public'
  AND grantee IN ('authenticated', 'service_role', 'anon', 'supabase_admin')
ORDER BY table_name, grantee, privilege_type;

-- =============================================
-- 8. SPECIFIC FOCUS: call_info_log ANALYSIS
-- =============================================
SELECT '=== CALL_INFO_LOG SPECIFIC ANALYSIS ===' as section;

-- call_info_log table structure
SELECT 
    'call_info_log columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_info_log'
ORDER BY ordinal_position;

-- Triggers on call_info_log
SELECT 
    'call_info_log triggers:' as info,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- Constraints on call_info_log
SELECT 
    'call_info_log constraints:' as info,
    constraint_name,
    constraint_type,
    pg_get_constraintdef(pgc.oid) as definition
FROM information_schema.table_constraints tc
LEFT JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.table_name = 'call_info_log';

-- Policies on call_info_log
SELECT 
    'call_info_log policies:' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'call_info_log';

-- =============================================
-- 9. SEARCH FOR UUID = TEXT ISSUES
-- =============================================
SELECT '=== POTENTIAL UUID = TEXT ISSUES ===' as section;

-- Functions that might contain UUID = TEXT comparisons
SELECT 
    'Functions with potential issues:' as info,
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE prosrc ILIKE '%assistant_id%'
   OR prosrc ILIKE '%uuid%text%'
   OR prosrc ILIKE '%text%uuid%'
ORDER BY proname;

SELECT 'COMPLETE DATABASE AUDIT FINISHED' as final_status;