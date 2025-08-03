-- Voice Matrix System Status Verification
-- Run this to check if all Level 10 fixes are applied

-- 1. Check current RLS policies status
SELECT 
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    COUNT(pol.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies pol ON pol.tablename = t.tablename
WHERE t.schemaname = 'public' 
AND t.tablename IN ('profiles', 'user_assistants', 'call_logs', 'error_logs')
GROUP BY schemaname, tablename, rowsecurity
ORDER BY tablename;

-- 2. Check if error_logs table exists
SELECT 
    'ERROR_LOGS_TABLE' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'error_logs' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 3. Check if Level 10 functions exist
SELECT 
    'FUNCTIONS' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_profile_safe', 'ensure_user_profile')
ORDER BY routine_name;

-- 4. Check current permissions on profiles table
SELECT 
    'PROFILES_PERMISSIONS' as check_type,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'service_role', 'anon')
ORDER BY grantee, privilege_type;

-- 5. Test if we can query profiles (this will show the current permission state)
DO $$
DECLARE
    profile_count INTEGER;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO profile_count FROM profiles LIMIT 1;
        RAISE NOTICE 'PROFILE_ACCESS: SUCCESS - Can query profiles table';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'PROFILE_ACCESS: ERROR - %', SQLERRM;
    END;
END
$$;

-- 6. Check database performance indexes
SELECT 
    'PERFORMANCE_INDEXES' as check_type,
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;