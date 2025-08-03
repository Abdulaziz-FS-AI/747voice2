-- Add fields to user_assistants for usage limit enforcement via timeout reduction
-- This stores original max_duration and tracks when assistants are usage-limited

ALTER TABLE public.user_assistants 
ADD COLUMN IF NOT EXISTS original_max_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS current_max_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS is_usage_limited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_limited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update existing assistants with their current max_duration from config
UPDATE public.user_assistants 
SET 
  original_max_duration = COALESCE((config->>'max_call_duration')::INTEGER, 300),
  current_max_duration = COALESCE((config->>'max_call_duration')::INTEGER, 300)
WHERE original_max_duration IS NULL OR current_max_duration IS NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_assistants_usage_limited ON public.user_assistants(user_id, is_usage_limited);

-- Grant permissions
GRANT SELECT, UPDATE ON public.user_assistants TO authenticated;