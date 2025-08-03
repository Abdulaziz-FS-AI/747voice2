-- Fix user_phone_numbers schema cache issue
-- The error suggests code is looking for 'friendly_name' but your table has 'name'

-- Check current column structure
SELECT 
    'CURRENT_PHONE_COLUMNS' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_phone_numbers'
ORDER BY ordinal_position;

-- Option 1: Add friendly_name as an alias/view of name column
ALTER TABLE user_phone_numbers 
ADD COLUMN IF NOT EXISTS friendly_name TEXT;

-- Copy existing name values to friendly_name
UPDATE user_phone_numbers 
SET friendly_name = name 
WHERE friendly_name IS NULL;

-- Option 2: Force complete schema cache refresh
COMMENT ON TABLE user_phone_numbers IS 'Schema cache refresh for phone numbers';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify the fix
SELECT 
    'PHONE_COLUMNS_AFTER_FIX' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_phone_numbers'
AND column_name IN ('name', 'friendly_name')
ORDER BY column_name;