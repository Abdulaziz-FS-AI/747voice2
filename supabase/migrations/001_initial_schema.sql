-- Voice Matrix Database Schema
-- This migration creates the complete database structure for the Voice Matrix platform

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUMS
-- =============================================

-- User roles within teams
CREATE TYPE user_role AS ENUM ('admin', 'agent', 'viewer');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');

-- Plan types
CREATE TYPE plan_type AS ENUM ('starter', 'professional', 'team', 'enterprise');

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

-- Teams table - represents organizations/companies
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID NOT NULL, -- Will be referenced to auth.users
    subscription_id VARCHAR(255), -- Stripe subscription ID
    plan_type plan_type NOT NULL DEFAULT 'starter',
    max_agents INTEGER NOT NULL DEFAULT 1,
    max_assistants INTEGER NOT NULL DEFAULT 1,
    max_minutes INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles table - extends Supabase auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY, -- References auth.users.id
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'admin',
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phone numbers table
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL, -- References auth.users.id
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL, -- References auth.users.id
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL, -- References auth.users.id
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
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
    user_id UUID NOT NULL, -- References auth.users.id
    interaction_type VARCHAR(50) NOT NULL, -- 'call', 'email', 'text', 'note'
    content TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table - track all important actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users.id
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
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
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
    UNIQUE(team_id, date, period_type)
);

-- =============================================
-- INDEXES
-- =============================================

-- Performance indexes
CREATE INDEX idx_profiles_team_id ON profiles(team_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_team_id ON assistants(team_id);
CREATE INDEX idx_assistants_active ON assistants(is_active);
CREATE INDEX idx_calls_assistant_id ON calls(assistant_id);
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_team_id ON calls(team_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_team_id ON leads(team_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_analytics_team_date ON analytics_snapshots(team_id, date);

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
$$ language 'plpgsql';

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

-- Function to get team usage statistics
CREATE OR REPLACE FUNCTION get_team_usage(p_team_id UUID)
RETURNS TABLE (
    current_agents INTEGER,
    current_assistants INTEGER,
    current_month_minutes INTEGER,
    current_month_calls INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE team_id = p_team_id),
        (SELECT COUNT(*)::INTEGER FROM assistants WHERE team_id = p_team_id AND is_active = true),
        (SELECT COALESCE(SUM(duration), 0)::INTEGER / 60 FROM calls 
         WHERE team_id = p_team_id 
         AND created_at >= date_trunc('month', CURRENT_DATE)),
        (SELECT COUNT(*)::INTEGER FROM calls 
         WHERE team_id = p_team_id 
         AND created_at >= date_trunc('month', CURRENT_DATE));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated at triggers for all tables
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TRIGGER calculate_lead_score_trigger
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_lead_score();