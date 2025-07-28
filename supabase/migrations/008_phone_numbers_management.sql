--
-- Phone Numbers Management System
-- Enhanced phone number management with provider support and testing mode
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PHONE NUMBERS TABLE (Enhanced)
-- =============================================

-- Drop existing phone_numbers table if it exists and recreate with new schema
DROP TABLE IF EXISTS phone_numbers CASCADE;

CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    
    -- Basic Information
    friendly_name VARCHAR(255) NOT NULL, -- "Main Sales Line", "Support Line"
    phone_number VARCHAR(20) NOT NULL, -- E.164 format: +15017122661
    
    -- Provider Configuration
    provider VARCHAR(50) NOT NULL DEFAULT 'testing', -- 'testing', 'twilio', 'vapi'
    provider_config JSONB DEFAULT '{}'::jsonb, -- Encrypted provider credentials
    
    -- Status & Verification
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false, -- For testing mode, always true
    verification_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed
    verification_error TEXT, -- Error message if verification failed
    
    -- Assignment & Usage
    assigned_assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    
    -- Analytics
    total_calls INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    last_call_at TIMESTAMPTZ,
    
    -- Webhook Configuration
    webhook_url TEXT, -- Where Twilio sends webhook events
    webhook_events TEXT[] DEFAULT ARRAY['call-start', 'call-end'], -- Which events to receive
    
    -- Metadata
    notes TEXT, -- User notes about this number
    tags TEXT[] DEFAULT '{}', -- Custom tags for organization
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_team_id ON phone_numbers(team_id);
CREATE INDEX idx_phone_numbers_phone_number ON phone_numbers(phone_number);
CREATE INDEX idx_phone_numbers_provider ON phone_numbers(provider);
CREATE INDEX idx_phone_numbers_assigned_assistant ON phone_numbers(assigned_assistant_id);
CREATE INDEX idx_phone_numbers_is_active ON phone_numbers(is_active);

-- Unique constraint: One phone number per user
CREATE UNIQUE INDEX idx_phone_numbers_unique_per_user 
    ON phone_numbers(user_id, phone_number) 
    WHERE is_active = true;

-- =============================================
-- PHONE NUMBER CALL LOGS
-- =============================================

CREATE TABLE phone_number_call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    
    -- Call Details
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    caller_number VARCHAR(20),
    called_number VARCHAR(20),
    call_status VARCHAR(50), -- 'initiated', 'ringing', 'answered', 'completed', 'failed'
    
    -- Provider Data
    provider_call_id VARCHAR(255), -- Twilio Call SID or other provider ID
    provider_data JSONB DEFAULT '{}'::jsonb,
    
    -- Metrics
    duration_seconds INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0, -- Cost in cents
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_phone_number_id ON phone_number_call_logs(phone_number_id);
CREATE INDEX idx_call_logs_call_id ON phone_number_call_logs(call_id);
CREATE INDEX idx_call_logs_provider_call_id ON phone_number_call_logs(provider_call_id);
CREATE INDEX idx_call_logs_started_at ON phone_number_call_logs(started_at);

-- =============================================
-- PROVIDER CONFIGURATIONS
-- =============================================

CREATE TABLE provider_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL, -- 'twilio', 'vapi'
    configuration_name VARCHAR(255) NOT NULL, -- "Production Twilio", "Test Account"
    
    -- Encrypted Configuration
    config_data JSONB NOT NULL, -- Encrypted credentials and settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default config for this provider
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMPTZ,
    verification_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_configs_user_id ON provider_configurations(user_id);
CREATE INDEX idx_provider_configs_provider ON provider_configurations(provider);
CREATE UNIQUE INDEX idx_provider_configs_default 
    ON provider_configurations(user_id, provider) 
    WHERE is_default = true;

-- =============================================
-- UPDATE EXISTING CALLS TABLE
-- =============================================

-- Add phone number relationship to calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calls_phone_number_id ON calls(phone_number_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_number_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for phone_numbers
CREATE POLICY "Users can manage their own phone numbers" ON phone_numbers
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for phone_number_call_logs
CREATE POLICY "Users can view their phone number call logs" ON phone_number_call_logs
    FOR SELECT USING (
        phone_number_id IN (
            SELECT id FROM phone_numbers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert call logs" ON phone_number_call_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- RLS Policies for provider_configurations
CREATE POLICY "Users can manage their own provider configs" ON provider_configurations
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to validate phone number format (E.164)
CREATE OR REPLACE FUNCTION validate_phone_number(phone_num TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if phone number matches E.164 format
    RETURN phone_num ~ '^\+[1-9]\d{1,14}$';
END;
$$;

-- Function to format phone number for display
CREATE OR REPLACE FUNCTION format_phone_number(phone_num TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    -- Format US numbers as (XXX) XXX-XXXX
    IF phone_num ~ '^\+1\d{10}$' THEN
        RETURN '(' || SUBSTRING(phone_num FROM 3 FOR 3) || ') ' || 
               SUBSTRING(phone_num FROM 6 FOR 3) || '-' || 
               SUBSTRING(phone_num FROM 9 FOR 4);
    END IF;
    
    -- Return as-is for non-US numbers
    RETURN phone_num;
END;
$$;

-- Function to update phone number statistics
CREATE OR REPLACE FUNCTION update_phone_number_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update phone number statistics when a call log is inserted
    IF TG_OP = 'INSERT' THEN
        UPDATE phone_numbers 
        SET 
            total_calls = total_calls + 1,
            total_minutes = total_minutes + COALESCE(NEW.duration_seconds / 60, 0),
            last_call_at = NEW.started_at,
            updated_at = NOW()
        WHERE id = NEW.phone_number_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger to automatically update phone number stats
CREATE TRIGGER update_phone_number_stats_trigger
    AFTER INSERT ON phone_number_call_logs
    FOR EACH ROW EXECUTE FUNCTION update_phone_number_stats();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_phone_number_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers for timestamp updates
CREATE TRIGGER update_phone_numbers_timestamp
    BEFORE UPDATE ON phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_phone_number_timestamp();

CREATE TRIGGER update_provider_configs_timestamp
    BEFORE UPDATE ON provider_configurations
    FOR EACH ROW EXECUTE FUNCTION update_phone_number_timestamp();

-- =============================================
-- DEFAULT DATA FOR TESTING
-- =============================================

-- Insert some sample provider configurations for development
INSERT INTO provider_configurations (user_id, provider, configuration_name, config_data, is_verified)
SELECT 
    id as user_id,
    'testing' as provider,
    'Testing Mode' as configuration_name,
    '{"description": "Testing mode - no external provider needed", "features": ["web_calls", "vapi_integration"]}' as config_data,
    true as is_verified
FROM profiles
ON CONFLICT DO NOTHING;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE phone_numbers IS 'Stores user phone numbers with provider configuration and usage analytics';
COMMENT ON TABLE phone_number_call_logs IS 'Logs all calls made to/from phone numbers with provider-specific data';
COMMENT ON TABLE provider_configurations IS 'Stores encrypted provider credentials (Twilio, Vapi, etc.)';

COMMENT ON COLUMN phone_numbers.provider IS 'Provider type: testing (no provider), twilio, vapi';
COMMENT ON COLUMN phone_numbers.provider_config IS 'Encrypted provider-specific configuration (credentials, settings)';
COMMENT ON COLUMN phone_numbers.verification_status IS 'Verification status: pending, verified, failed';
COMMENT ON COLUMN phone_numbers.webhook_url IS 'URL where provider sends webhook events for this number';

COMMENT ON FUNCTION validate_phone_number IS 'Validates phone number format according to E.164 standard';
COMMENT ON FUNCTION format_phone_number IS 'Formats phone number for display (US format for US numbers)';
COMMENT ON FUNCTION update_phone_number_stats IS 'Automatically updates phone number usage statistics';

-- =============================================
-- PERFORMANCE OPTIMIZATIONS
-- =============================================

-- Partial indexes for common queries
CREATE INDEX idx_phone_numbers_active_assigned 
    ON phone_numbers(user_id, assigned_assistant_id) 
    WHERE is_active = true;

CREATE INDEX idx_call_logs_recent 
    ON phone_number_call_logs(phone_number_id, started_at DESC) 
    WHERE started_at > NOW() - INTERVAL '30 days';

-- Statistics for query planner
ANALYZE phone_numbers;
ANALYZE phone_number_call_logs;
ANALYZE provider_configurations;