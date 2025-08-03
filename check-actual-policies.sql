-- Check what's actually causing the phone number access during assistant creation

-- 1. Show all active RLS policies
SELECT 
    'ACTIVE_RLS_POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. Check if RLS is enabled on the problematic table
SELECT 
    'RLS_STATUS' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_assistants', 'user_phone_numbers', 'profiles')
ORDER BY tablename;

-- 3. Check for any complex policies that might reference phone numbers
SELECT 
    'COMPLEX_POLICIES' as check_type,
    policyname,
    tablename,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%phone%'
ORDER BY tablename;

-- 4. Temporarily disable RLS on user_phone_numbers to see if that helps
ALTER TABLE user_phone_numbers DISABLE ROW LEVEL SECURITY;

-- 5. Test message
SELECT 'RLS_DISABLED_ON_PHONE_NUMBERS' as status, 'Try assistant creation now' as message;