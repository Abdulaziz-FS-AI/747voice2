-- ACTUAL DIAGNOSIS: Let's see what's really happening
-- Run this first to understand the current state

-- 1. What tables actually exist?
SELECT 'EXISTING_TABLES' as check_type, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. What's the exact error when accessing profiles?
DO $$
BEGIN
    PERFORM 1 FROM profiles LIMIT 1;
    RAISE NOTICE 'SUCCESS: Can access profiles table';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR accessing profiles: SQLSTATE=%, MESSAGE=%', SQLSTATE, SQLERRM;
END
$$;

-- 3. What's the exact error when accessing user_assistants?
DO $$
BEGIN
    PERFORM 1 FROM user_assistants LIMIT 1;
    RAISE NOTICE 'SUCCESS: Can access user_assistants table';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR accessing user_assistants: SQLSTATE=%, MESSAGE=%', SQLSTATE, SQLERRM;
END
$$;

-- 4. What RLS policies currently exist?
SELECT 'CURRENT_POLICIES' as check_type, schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. What are the current table permissions?
SELECT 'CURRENT_PERMISSIONS' as check_type, table_name, grantee, privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_assistants')
AND grantee IN ('authenticated', 'anon', 'service_role', 'public')
ORDER BY table_name, grantee;

-- 6. What's the current user context?
SELECT 
    'USER_CONTEXT' as check_type,
    current_user as current_user,
    session_user as session_user,
    current_setting('role', true) as current_role;