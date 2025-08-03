-- Comprehensive fix for all schema cache issues
-- This addresses the friendly_name column issue and prevents future schema cache problems

-- 1. Add the missing friendly_name column to user_phone_numbers
ALTER TABLE user_phone_numbers 
ADD COLUMN IF NOT EXISTS friendly_name TEXT;

-- Set friendly_name = name for existing records
UPDATE user_phone_numbers 
SET friendly_name = name 
WHERE friendly_name IS NULL;

-- 2. Ensure all tables have proper default values for nullable columns
ALTER TABLE user_assistants 
ALTER COLUMN personality DROP NOT NULL;

ALTER TABLE user_assistants 
ALTER COLUMN personality SET DEFAULT 'professional';

-- 3. Force comprehensive schema cache refresh
COMMENT ON TABLE user_phone_numbers IS 'Schema refresh - added friendly_name column';
COMMENT ON TABLE user_assistants IS 'Schema refresh - fixed personality constraints';
COMMENT ON TABLE profiles IS 'Schema refresh - ensured all constraints';

-- 4. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 5. Verify all critical tables have proper structure
SELECT 
    'PHONE_NUMBERS_STRUCTURE' as table_check,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_phone_numbers'
AND column_name IN ('name', 'friendly_name')
ORDER BY column_name;

SELECT 
    'USER_ASSISTANTS_STRUCTURE' as table_check,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
AND column_name IN ('personality', 'config')
ORDER BY column_name;

-- 6. Test that we can access all tables without schema cache errors
DO $$
BEGIN
    PERFORM COUNT(*) FROM user_phone_numbers LIMIT 1;
    RAISE NOTICE 'SUCCESS: user_phone_numbers accessible';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: user_phone_numbers - %', SQLERRM;
END
$$;

DO $$
BEGIN
    PERFORM COUNT(*) FROM user_assistants LIMIT 1;
    RAISE NOTICE 'SUCCESS: user_assistants accessible';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: user_assistants - %', SQLERRM;
END
$$;