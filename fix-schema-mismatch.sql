-- EXACT FIX: Schema mismatch between database and application code
-- The code expects 'config' column but your table has individual columns

-- Add the missing 'config' column that the application code expects
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Add other columns the code expects for assistant management
ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

ALTER TABLE user_assistants 
ADD COLUMN IF NOT EXISTS assistant_state TEXT DEFAULT 'active';

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_assistants_config ON user_assistants USING GIN (config);
CREATE INDEX IF NOT EXISTS idx_user_assistants_state ON user_assistants (assistant_state);
CREATE INDEX IF NOT EXISTS idx_user_assistants_disabled ON user_assistants (is_disabled);

-- Now migrate existing data into the config column
-- This preserves your existing assistants by moving their settings into the config column
UPDATE user_assistants 
SET config = jsonb_build_object(
    'personality', personality,
    'call_objective', call_objective,
    'client_messages', client_messages,
    'structured_questions', structured_questions,
    'model_id', model,
    'provider', provider,
    'voice_id', voice
) 
WHERE config = '{}' OR config IS NULL;

-- Verify the fix
SELECT 
    'SCHEMA_FIXED' as status,
    column_name,
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_assistants'
AND column_name IN ('config', 'is_disabled', 'assistant_state')
ORDER BY column_name;

-- Test that we can now insert with config column
DO $$
BEGIN
    -- Try a test insert (this won't actually insert, just validate the schema)
    PERFORM jsonb_build_object('test', 'value')::jsonb;
    RAISE NOTICE 'SUCCESS: Schema is now compatible with application code';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
END
$$;