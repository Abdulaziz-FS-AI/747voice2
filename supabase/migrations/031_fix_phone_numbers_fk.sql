-- Fix foreign key constraint in phone_numbers table
-- The assigned_assistant_id should reference user_assistants(id), not assistants(id)

-- Drop the existing foreign key constraint
ALTER TABLE phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_assigned_assistant_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE phone_numbers 
ADD CONSTRAINT phone_numbers_assigned_assistant_id_fkey 
FOREIGN KEY (assigned_assistant_id) 
REFERENCES user_assistants(id) 
ON DELETE SET NULL;

-- Update the index to match
DROP INDEX IF EXISTS idx_phone_numbers_assigned_assistant;
CREATE INDEX idx_phone_numbers_assigned_assistant ON phone_numbers(assigned_assistant_id);

-- Grant necessary permissions for the corrected table
GRANT SELECT, INSERT, UPDATE, DELETE ON phone_numbers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON phone_number_call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_configurations TO authenticated;