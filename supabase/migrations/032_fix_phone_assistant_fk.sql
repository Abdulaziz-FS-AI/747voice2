-- Fix phone_numbers foreign key to reference assistants table
-- Ensure the phone_numbers table properly references assistants, not user_assistants

-- First, ensure the assigned_assistant_id column exists
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS assigned_assistant_id UUID;

-- Drop any existing foreign key constraints
ALTER TABLE phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_assigned_assistant_id_fkey;

-- Add the correct foreign key constraint pointing to assistants table
ALTER TABLE phone_numbers 
ADD CONSTRAINT phone_numbers_assigned_assistant_id_fkey 
FOREIGN KEY (assigned_assistant_id) 
REFERENCES assistants(id) 
ON DELETE SET NULL;

-- Ensure proper indexing
DROP INDEX IF EXISTS idx_phone_numbers_assigned_assistant;
CREATE INDEX idx_phone_numbers_assigned_assistant ON phone_numbers(assigned_assistant_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON phone_numbers TO authenticated;