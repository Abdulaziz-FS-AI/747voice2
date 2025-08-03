-- Debug the real issue - your schema looks correct
-- The error "Could not find the 'config' column" suggests a cache/connection issue

-- 1. Verify the config column exists
SELECT 
    'CONFIG_COLUMN_CHECK' as test,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
AND column_name = 'config';

-- 2. Test if we can actually query the config column
DO $$
DECLARE
    test_config jsonb;
BEGIN
    SELECT config INTO test_config FROM user_assistants LIMIT 1;
    RAISE NOTICE 'SUCCESS: Can access config column. Sample value: %', COALESCE(test_config::text, 'NULL');
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR accessing config column: %', SQLERRM;
END
$$;

-- 3. Test if we can insert with config column
DO $$
BEGIN
    -- This is just a test - will rollback
    INSERT INTO user_assistants (
        user_id, 
        name, 
        personality, 
        config
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', 
        'TEST', 
        'professional', 
        '{"test": true}'::jsonb
    );
    RAISE NOTICE 'SUCCESS: Can insert with config column';
    ROLLBACK;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting with config: %', SQLERRM;
        ROLLBACK;
END
$$;

-- 4. Check for any triggers or constraints that might be interfering
SELECT 
    'TRIGGERS' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_assistants';

-- 5. Check current RLS policies
SELECT 
    'RLS_POLICIES' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'user_assistants';

-- 6. Refresh the schema cache (this might fix the issue)
NOTIFY pgrst, 'reload schema';