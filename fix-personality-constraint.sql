-- Fix the personality NOT NULL constraint issue
-- The app stores personality in config JSON, not the personality column

-- Option 1: Make personality column nullable (RECOMMENDED)
ALTER TABLE user_assistants 
ALTER COLUMN personality DROP NOT NULL;

-- Set a default value for existing rows that might be NULL
UPDATE user_assistants 
SET personality = 'professional' 
WHERE personality IS NULL;

-- Option 2: Add a default value to the personality column
ALTER TABLE user_assistants 
ALTER COLUMN personality SET DEFAULT 'professional';

-- Verify the change
SELECT 
    'PERSONALITY_COLUMN' as check_type,
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
AND column_name = 'personality';