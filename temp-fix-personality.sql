-- Temporary fix: Make personality nullable while we debug
-- This will allow assistant creation to work while we figure out the data issue

ALTER TABLE user_assistants 
ALTER COLUMN personality DROP NOT NULL;

ALTER TABLE user_assistants 
ALTER COLUMN personality SET DEFAULT 'professional';

-- Update any existing NULL values
UPDATE user_assistants 
SET personality = 'professional' 
WHERE personality IS NULL;

SELECT 'PERSONALITY_FIXED' as status, 'Column is now nullable with default' as message;