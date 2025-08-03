-- Simple Permission Test
-- Run this to test if the permission denied error is fixed

-- Test 1: Check if we can access profiles table
DO $$
DECLARE
    profile_count INTEGER;
    test_result TEXT;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO profile_count FROM profiles;
        RAISE NOTICE '✅ SUCCESS: Can query profiles table (found % profiles)', profile_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR: Cannot query profiles table - %', SQLERRM;
    END;
END
$$;

-- Test 2: Check if we can access user_assistants table  
DO $$
DECLARE
    assistant_count INTEGER;
BEGIN
    BEGIN
        SELECT COUNT(*) INTO assistant_count FROM user_assistants;
        RAISE NOTICE '✅ SUCCESS: Can query user_assistants table (found % assistants)', assistant_count;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR: Cannot query user_assistants table - %', SQLERRM;
    END;
END
$$;

-- Test 3: Show current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_assistants', 'call_logs')
ORDER BY tablename;

-- Test 4: Show current permissions
SELECT 
    table_name,
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND grantee IN ('authenticated', 'service_role')
ORDER BY grantee, privilege_type;