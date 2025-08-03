-- Fix the missing 'config' column in user_assistants table
-- This is what's causing the assistant creation to fail

-- First, let's see what columns exist
SELECT 'CURRENT_COLUMNS' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
ORDER BY ordinal_position;

-- Add the missing config column
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Also add any other columns that might be missing
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS assistant_state TEXT DEFAULT 'active';

-- Create an index on the config column for better performance
CREATE INDEX IF NOT EXISTS idx_user_assistants_config ON user_assistants USING GIN (config);

-- Verify the columns were added
SELECT 'UPDATED_COLUMNS' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
ORDER BY ordinal_position;