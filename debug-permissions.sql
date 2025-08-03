-- Debug permission issues
-- Run this to check what's causing the permission denied error

-- Check current user and role
SELECT 
    current_user,
    current_setting('role'),
    session_user;

-- Check if the user has permissions on profiles table
SELECT 
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'service_role', current_user);

-- Check RLS policies on profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'user_assistants', 'call_logs')
AND schemaname = 'public';

-- Try a simple select to see what happens
DO $$
BEGIN
    PERFORM COUNT(*) FROM profiles LIMIT 1;
    RAISE NOTICE 'Profiles table accessible';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profiles table error: %', SQLERRM;
END
$$;