-- Force Supabase to refresh its schema cache
-- This should fix the "Could not find the 'config' column" error

-- 1. Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- 2. Force reload config
NOTIFY pgrst, 'reload config';

-- 3. Alternative method - touch the table to force cache refresh
COMMENT ON TABLE user_assistants IS 'Schema cache refresh trigger';

-- 4. Verify the table structure is visible
SELECT 
    'SCHEMA_VISIBLE' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants';

-- 5. Test a simple select to verify cache is working
SELECT 
    'TEST_SELECT' as test,
    COUNT(*) as assistant_count
FROM user_assistants;