-- Voice Matrix Single User Database Schema
-- Clean migration for empty database - no team functionality
-- This creates a complete single-user voice AI assistant platform

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- Assistant personality types
CREATE TYPE personality_type AS ENUM ('professional', 'friendly', 'casual');

-- Call status
CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'answered', 'completed', 'failed', 'busy', 'no_answer');

-- Call direction
CREATE TYPE call_direction AS ENUM ('inbound', 'outbound');

-- Lead types
CREATE TYPE lead_type AS ENUM ('buyer', 'seller', 'investor', 'renter');

-- Lead status
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- =============================================
-- CORE TABLES
-- =============================================

-- User profiles table - extends Supabase auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- References auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    phone VARCHAR(20),
    
    -- Subscription management
    subscription_id VARCHAR(255), -- Stripe subscription ID
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_current_period_end TIMESTAMPTZ,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    trial_ends_at TIMESTAMPTZ,
    
    -- Usage limits (single tier)
    max_assistants INTEGER NOT NULL DEFAULT 3,
    max_minutes INTEGER NOT NULL DEFAULT 1000,
    max_phone_numbers INTEGER NOT NULL DEFAULT 1,
    
    -- User settings
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phone numbers table
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL UNIQUE,
    country_code VARCHAR(5) NOT NULL,
    vapi_phone_number_id VARCHAR(255), -- Vapi phone number ID
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    monthly_cost DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assistants table - AI voice assistants
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    personality personality_type NOT NULL DEFAULT 'professional',
    company_name VARCHAR(255),
    max_call_duration INTEGER NOT NULL DEFAULT 300, -- seconds
    background_ambiance VARCHAR(100) DEFAULT 'office',
    voice_id VARCHAR(100), -- Vapi voice ID
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    vapi_assistant_id VARCHAR(255), -- Vapi assistant ID
    system_prompt TEXT,
    first_message TEXT,
    language VARCHAR(10) NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calls table - call records and analytics
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vapi_call_id VARCHAR(255), -- Vapi call ID
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    phone_number_id UUID REFERENCES phone_numbers(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    caller_number VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255),
    duration INTEGER DEFAULT 0, -- seconds
    cost DECIMAL(10,4) DEFAULT 0.0000,
    status call_status NOT NULL DEFAULT 'initiated',
    direction call_direction NOT NULL DEFAULT 'inbound',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call transcripts table
CREATE TABLE call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    speaker VARCHAR(20) NOT NULL, -- 'assistant' or 'caller'
    timestamp_offset INTEGER NOT NULL DEFAULT 0, -- seconds from call start
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads table - captured lead information
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    lead_type lead_type,
    lead_source VARCHAR(100) NOT NULL DEFAULT 'voice_call',
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    status lead_status NOT NULL DEFAULT 'new',
    property_type TEXT[], -- Array of property types
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    preferred_locations TEXT[], -- Array of location preferences
    timeline VARCHAR(100),
    notes TEXT,
    tags TEXT[], -- Array of tags
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lead interactions table - track all touchpoints
CREATE TABLE lead_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'text', 'note'
    content TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table - track all important actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analytics snapshots table - daily/monthly aggregated data
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL, -- 'daily', 'monthly'
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- seconds
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    leads_generated INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    avg_call_duration DECIMAL(8,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date, period_type)
);

-- Assistant templates table - pre-built assistant configurations
CREATE TABLE assistant_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    personality personality_type NOT NULL DEFAULT 'professional',
    system_prompt TEXT NOT NULL,
    first_message TEXT,
    voice_id VARCHAR(100),
    industry VARCHAR(100),
    use_case VARCHAR(255),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking table - track monthly usage per user
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    minutes_used INTEGER NOT NULL DEFAULT 0,
    calls_made INTEGER NOT NULL DEFAULT 0,
    assistants_created INTEGER NOT NULL DEFAULT 0,
    phone_numbers_used INTEGER NOT NULL DEFAULT 0,
    overage_minutes INTEGER NOT NULL DEFAULT 0,
    overage_cost DECIMAL(10,4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- =============================================
-- INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_active ON phone_numbers(is_active);
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_active ON assistants(is_active);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_assistant_id ON calls(assistant_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_user_id ON lead_interactions(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_analytics_user_date ON analytics_snapshots(user_id, date);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate lead score based on various factors
CREATE OR REPLACE FUNCTION calculate_lead_score(
    p_lead_type lead_type,
    p_budget_min DECIMAL,
    p_budget_max DECIMAL,
    p_timeline VARCHAR,
    p_property_type TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Base score for lead type
    CASE p_lead_type
        WHEN 'buyer' THEN score := score + 40;
        WHEN 'seller' THEN score := score + 35;
        WHEN 'investor' THEN score := score + 45;
        WHEN 'renter' THEN score := score + 20;
        ELSE score := score + 10;
    END CASE;
    
    -- Budget scoring
    IF p_budget_min IS NOT NULL THEN
        CASE 
            WHEN p_budget_min >= 1000000 THEN score := score + 30;
            WHEN p_budget_min >= 500000 THEN score := score + 25;
            WHEN p_budget_min >= 200000 THEN score := score + 20;
            WHEN p_budget_min >= 100000 THEN score := score + 15;
            ELSE score := score + 10;
        END CASE;
    END IF;
    
    -- Timeline scoring
    CASE p_timeline
        WHEN 'immediate' THEN score := score + 20;
        WHEN '1-3 months' THEN score := score + 15;
        WHEN '3-6 months' THEN score := score + 10;
        WHEN '6-12 months' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;
    
    -- Property type diversity bonus
    IF array_length(p_property_type, 1) > 1 THEN
        score := score + 5;
    END IF;
    
    -- Ensure score is within bounds
    RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user usage statistics
CREATE OR REPLACE FUNCTION get_user_usage(p_user_id UUID)
RETURNS TABLE (
    current_assistants INTEGER,
    current_phone_numbers INTEGER,
    current_month_minutes INTEGER,
    current_month_calls INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM assistants WHERE user_id = p_user_id AND is_active = true),
        (SELECT COUNT(*)::INTEGER FROM phone_numbers WHERE user_id = p_user_id AND is_active = true),
        (SELECT COALESCE(SUM(duration), 0)::INTEGER / 60 FROM calls 
         WHERE user_id = p_user_id 
         AND created_at >= date_trunc('month', CURRENT_DATE)),
        (SELECT COUNT(*)::INTEGER FROM calls 
         WHERE user_id = p_user_id 
         AND created_at >= date_trunc('month', CURRENT_DATE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update usage tracking
CREATE OR REPLACE FUNCTION update_usage_tracking()
RETURNS TRIGGER AS $$
DECLARE
    current_month DATE := date_trunc('month', CURRENT_DATE);
BEGIN
    -- Update usage tracking for the user
    INSERT INTO usage_tracking (user_id, month, minutes_used, calls_made)
    VALUES (NEW.user_id, current_month, COALESCE(NEW.duration, 0) / 60, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET
        minutes_used = usage_tracking.minutes_used + (COALESCE(NEW.duration, 0) / 60),
        calls_made = usage_tracking.calls_made + 1,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at triggers for all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically calculate lead score
CREATE OR REPLACE FUNCTION trigger_calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.score := calculate_lead_score(
        NEW.lead_type,
        NEW.budget_min,
        NEW.budget_max,
        NEW.timeline,
        NEW.property_type
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_lead_score_trigger
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_lead_score();

-- Trigger to update usage tracking when calls are completed
CREATE TRIGGER update_usage_on_call_complete
    AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION update_usage_tracking();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view/update their own profile only
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Phone Numbers: Users can only manage their own phone numbers
CREATE POLICY "Users can manage own phone numbers" ON phone_numbers
    FOR ALL USING (user_id = auth.uid());

-- Assistants: Users can only access their own assistants
CREATE POLICY "Users can manage own assistants" ON assistants
    FOR ALL USING (user_id = auth.uid());

-- Calls: Users can only access their own calls
CREATE POLICY "Users can manage own calls" ON calls
    FOR ALL USING (user_id = auth.uid());

-- Call Transcripts: Users can only access transcripts for their calls
CREATE POLICY "Users can view own call transcripts" ON call_transcripts
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can create call transcripts" ON call_transcripts
    FOR INSERT WITH CHECK (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

-- Leads: Users can only access their own leads
CREATE POLICY "Users can manage own leads" ON leads
    FOR ALL USING (user_id = auth.uid());

-- Lead Interactions: Users can only access interactions for their leads
CREATE POLICY "Users can manage own lead interactions" ON lead_interactions
    FOR ALL USING (
        user_id = auth.uid() OR
        lead_id IN (
            SELECT id FROM leads WHERE user_id = auth.uid()
        )
    );

-- Audit Logs: Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Analytics: Users can only view their own analytics
CREATE POLICY "Users can view own analytics" ON analytics_snapshots
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage user analytics" ON analytics_snapshots
    FOR ALL USING (user_id = auth.uid());

-- Assistant Templates: Everyone can view public templates
CREATE POLICY "Users can view public templates" ON assistant_templates
    FOR SELECT USING (is_public = true);

-- Usage Tracking: Users can only view their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage user usage" ON usage_tracking
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- SEED DATA
-- =============================================

-- Insert default assistant templates
INSERT INTO assistant_templates (name, description, personality, system_prompt, first_message, industry, use_case) VALUES
('Real Estate Agent', 'Professional real estate assistant for lead qualification', 'professional', 
'You are a professional real estate assistant. Your goal is to qualify leads by gathering their contact information, property preferences, budget, and timeline. Be helpful and professional.',
'Hi! Thanks for calling. I''m here to help you with your real estate needs. Could you please tell me your name and what type of property you''re looking for?',
'real_estate', 'Lead qualification and initial contact'),

('Friendly Receptionist', 'Warm and welcoming virtual receptionist', 'friendly',
'You are a friendly virtual receptionist. Greet callers warmly, gather their information, and help direct their inquiries appropriately. Always be polite and helpful.',
'Hello! Thank you for calling. I''m your virtual assistant. How can I help you today?',
'general', 'General reception and call routing'),

('Sales Qualifier', 'Efficient sales lead qualification assistant', 'professional',
'You are a sales qualification assistant. Your job is to determine if callers are qualified prospects by asking about their needs, budget, timeline, and decision-making authority.',
'Hi there! Thanks for your interest. I''d love to learn more about your needs to see how we can best help you. Could you start by telling me your name?',
'sales', 'Sales lead qualification');

COMMENT ON TABLE profiles IS 'User profiles with subscription and usage limit management';
COMMENT ON TABLE assistants IS 'AI voice assistants configured by users';
COMMENT ON TABLE calls IS 'Call records and performance analytics';
COMMENT ON TABLE leads IS 'Lead information captured from calls';
COMMENT ON TABLE assistant_templates IS 'Pre-built assistant configurations for different use cases';
COMMENT ON TABLE usage_tracking IS 'Monthly usage tracking per user for billing and limits';