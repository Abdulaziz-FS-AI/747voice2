-- Add admin-configurable display fields to client_assistants table
-- These fields will be managed by administrators to provide better context to users

ALTER TABLE client_assistants 
ADD COLUMN IF NOT EXISTS assistant_role TEXT,
ADD COLUMN IF NOT EXISTS assistant_description TEXT,
ADD COLUMN IF NOT EXISTS background_noise_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS evaluation_type TEXT DEFAULT 'conversation_quality';

-- Add comments for clarity
COMMENT ON COLUMN client_assistants.assistant_role IS 'Admin-defined role/position of the assistant (e.g., "Scheduling Assistant", "Customer Support")';
COMMENT ON COLUMN client_assistants.assistant_description IS 'Admin-defined description of what this assistant does and its purpose';
COMMENT ON COLUMN client_assistants.background_noise_enabled IS 'Whether background noise processing is enabled for this assistant';
COMMENT ON COLUMN client_assistants.evaluation_type IS 'Type of evaluation method used (conversation_quality, lead_qualification, etc.)';

-- Update existing assistants with default values
UPDATE client_assistants 
SET 
  assistant_role = 'Voice Assistant',
  assistant_description = 'AI-powered voice assistant for customer interactions',
  background_noise_enabled = false,
  evaluation_type = 'conversation_quality'
WHERE assistant_role IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_assistants_role ON client_assistants(assistant_role);