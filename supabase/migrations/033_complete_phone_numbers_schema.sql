-- Complete phone numbers schema to match PhoneNumberService expectations
-- This adds all the columns that the service requires

-- Add missing columns to phone_numbers table
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS friendly_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'twilio',
ADD COLUMN IF NOT EXISTS vapi_phone_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS vapi_credential_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS twilio_account_sid VARCHAR(255),
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
ADD COLUMN IF NOT EXISTS assigned_assistant_id UUID,
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_call_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS call_count INTEGER DEFAULT 0;

-- Copy data from 'number' to 'phone_number' if phone_number is empty
UPDATE phone_numbers 
SET phone_number = number 
WHERE phone_number IS NULL AND number IS NOT NULL;

-- Add foreign key constraint for assigned_assistant_id
ALTER TABLE phone_numbers 
DROP CONSTRAINT IF EXISTS phone_numbers_assigned_assistant_id_fkey;

ALTER TABLE phone_numbers 
ADD CONSTRAINT phone_numbers_assigned_assistant_id_fkey 
FOREIGN KEY (assigned_assistant_id) 
REFERENCES assistants(id) 
ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_vapi_phone_id ON phone_numbers(vapi_phone_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assigned_assistant ON phone_numbers(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_active ON phone_numbers(is_active);

-- Update RLS policies to ensure users can only access their phone numbers
DROP POLICY IF EXISTS "Users can manage own phone numbers" ON phone_numbers;
CREATE POLICY "Users can manage own phone numbers" ON phone_numbers
    FOR ALL USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON phone_numbers TO authenticated;