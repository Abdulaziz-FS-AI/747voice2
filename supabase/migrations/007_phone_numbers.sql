-- Phone Numbers Table for Voice Matrix
-- This migration creates the phone_numbers table with proper VAPI integration

-- =============================================
-- PHONE NUMBERS TABLE
-- =============================================

CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Information
    phone_number VARCHAR(20) NOT NULL,
    friendly_name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'twilio',
    
    -- VAPI Integration
    vapi_phone_id VARCHAR(255) UNIQUE,
    vapi_credential_id VARCHAR(255),
    
    -- Twilio Credentials (should be encrypted in production)
    twilio_account_sid VARCHAR(255),
    twilio_auth_token TEXT, -- Encrypted in production
    
    -- Assignment
    assigned_assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    
    -- Configuration
    webhook_url TEXT,
    notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_call_at TIMESTAMPTZ,
    call_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_phone UNIQUE(user_id, phone_number)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_vapi_phone_id ON phone_numbers(vapi_phone_id);
CREATE INDEX idx_phone_numbers_assigned_assistant ON phone_numbers(assigned_assistant_id);
CREATE INDEX idx_phone_numbers_active ON phone_numbers(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at trigger
CREATE TRIGGER update_phone_numbers_updated_at 
    BEFORE UPDATE ON phone_numbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users can only view their own phone numbers
CREATE POLICY "Users can view own phone numbers" ON phone_numbers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own phone numbers
CREATE POLICY "Users can create own phone numbers" ON phone_numbers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own phone numbers
CREATE POLICY "Users can update own phone numbers" ON phone_numbers
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own phone numbers
CREATE POLICY "Users can delete own phone numbers" ON phone_numbers
    FOR DELETE USING (auth.uid() = user_id);