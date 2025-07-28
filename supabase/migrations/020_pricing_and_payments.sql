-- Pricing and Payment System for Voice Matrix
-- This migration adds pricing tiers and payment requirements

-- =============================================
-- PRICING PLANS TABLE
-- =============================================

CREATE TABLE pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    max_assistants INTEGER NOT NULL DEFAULT 1,
    max_minutes INTEGER NOT NULL DEFAULT 100,
    max_phone_numbers INTEGER NOT NULL DEFAULT 1,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, past_due, trial
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENT METHODS TABLE
-- =============================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    stripe_payment_method_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- card, bank_account
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENT HISTORY TABLE
-- =============================================

CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id),
    stripe_payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- succeeded, failed, pending, cancelled
    description TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INSERT DEFAULT PRICING PLANS
-- =============================================

INSERT INTO pricing_plans (name, display_name, description, price_monthly, price_yearly, max_assistants, max_minutes, max_phone_numbers, features, sort_order) VALUES 
('starter', 'Starter Plan', 'Perfect for small teams getting started with voice AI', 29.00, 290.00, 2, 500, 1, 
 '["2 AI Assistants", "500 minutes/month", "1 Phone Number", "Basic Analytics", "Email Support"]'::jsonb, 1),

('professional', 'Professional Plan', 'Ideal for growing businesses with multiple assistants', 79.00, 790.00, 5, 2000, 3, 
 '["5 AI Assistants", "2000 minutes/month", "3 Phone Numbers", "Advanced Analytics", "Priority Support", "Custom Templates", "Team Collaboration"]'::jsonb, 2),

('enterprise', 'Enterprise Plan', 'For large organizations with unlimited needs', 199.00, 1990.00, 25, 10000, 10, 
 '["25 AI Assistants", "10000 minutes/month", "10 Phone Numbers", "Advanced Analytics", "Priority Support", "Custom Templates", "Team Collaboration", "API Access", "Custom Integrations", "Dedicated Account Manager"]'::jsonb, 3);

-- =============================================
-- UPDATE TEAMS TABLE
-- =============================================

-- Add payment required flag and admin status
ALTER TABLE teams ADD COLUMN requires_payment BOOLEAN DEFAULT true;
ALTER TABLE teams ADD COLUMN is_admin_team BOOLEAN DEFAULT false;

-- =============================================
-- UPDATE PROFILES TABLE  
-- =============================================

-- Add admin status to profiles
ALTER TABLE profiles ADD COLUMN is_system_admin BOOLEAN DEFAULT false;

-- =============================================
-- CREATE ADMIN PROFILE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION create_admin_profile()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
    admin_team_id UUID;
BEGIN
    -- Check if admin already exists
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'abdulaziz.fs.ai@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        -- Check if profile exists
        SELECT team_id INTO admin_team_id FROM profiles WHERE id = admin_user_id;
        
        IF admin_team_id IS NULL THEN
            -- Create admin team
            INSERT INTO teams (name, plan_type, requires_payment, is_admin_team, max_assistants, max_minutes)
            VALUES ('Admin Team', 'enterprise', false, true, 999, 999999)
            RETURNING id INTO admin_team_id;
            
            -- Create admin profile
            INSERT INTO profiles (
                id, email, full_name, role, team_id, is_system_admin,
                onboarding_completed, created_at, updated_at
            ) VALUES (
                admin_user_id, 'abdulaziz.fs.ai@gmail.com', 'System Administrator', 
                'admin', admin_team_id, true, true, NOW(), NOW()
            );
        ELSE
            -- Update existing profile to admin
            UPDATE profiles SET 
                is_system_admin = true,
                role = 'admin'
            WHERE id = admin_user_id;
            
            -- Update team to admin team
            UPDATE teams SET
                requires_payment = false,
                is_admin_team = true,
                max_assistants = 999,
                max_minutes = 999999
            WHERE id = admin_team_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payment_methods_team_id ON payment_methods(team_id);
CREATE INDEX idx_payment_history_team_id ON payment_history(team_id);
CREATE INDEX idx_pricing_plans_active ON pricing_plans(is_active);
CREATE INDEX idx_teams_requires_payment ON teams(requires_payment);
CREATE INDEX idx_profiles_system_admin ON profiles(is_system_admin);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Public access to active pricing plans
CREATE POLICY "Anyone can view active pricing plans" ON pricing_plans
    FOR SELECT USING (is_active = true);

-- Team members can view their subscription
CREATE POLICY "Team members can view team subscription" ON subscriptions
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Team admins can manage subscription
CREATE POLICY "Team admins can manage subscription" ON subscriptions
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin')
        )
    );

-- Team members can view payment methods
CREATE POLICY "Team members can view payment methods" ON payment_methods
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Team admins can manage payment methods
CREATE POLICY "Team admins can manage payment methods" ON payment_methods
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin')
        )
    );

-- Team members can view payment history
CREATE POLICY "Team members can view payment history" ON payment_history
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- =============================================
-- UPDATED AT TRIGGERS
-- =============================================

CREATE TRIGGER update_pricing_plans_updated_at 
    BEFORE UPDATE ON pricing_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_history_updated_at 
    BEFORE UPDATE ON payment_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =============================================

-- Check if team has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(team_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    team_record RECORD;
BEGIN
    SELECT requires_payment, is_admin_team INTO team_record
    FROM teams WHERE id = team_uuid;
    
    -- Admin teams don't require payment
    IF team_record.is_admin_team = true THEN
        RETURN true;
    END IF;
    
    -- If team doesn't require payment, return true
    IF team_record.requires_payment = false THEN
        RETURN true;
    END IF;
    
    -- Check for active subscription
    RETURN EXISTS (
        SELECT 1 FROM subscriptions 
        WHERE team_id = team_uuid 
        AND status = 'active'
        AND current_period_end > NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Check subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limit(
    team_uuid UUID,
    resource_type TEXT,
    current_count INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    team_record RECORD;
    subscription_record RECORD;
    plan_record RECORD;
    limit_value INTEGER;
BEGIN
    -- Get team info
    SELECT * INTO team_record FROM teams WHERE id = team_uuid;
    
    -- Admin teams have unlimited access
    IF team_record.is_admin_team = true THEN
        RETURN true;
    END IF;
    
    -- Get active subscription
    SELECT * INTO subscription_record 
    FROM subscriptions 
    WHERE team_id = team_uuid 
    AND status = 'active'
    AND current_period_end > NOW()
    LIMIT 1;
    
    -- No active subscription
    IF subscription_record.id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get plan limits
    SELECT * INTO plan_record 
    FROM pricing_plans 
    WHERE id = subscription_record.pricing_plan_id;
    
    -- Check specific resource limits
    CASE resource_type
        WHEN 'assistants' THEN
            limit_value := plan_record.max_assistants;
        WHEN 'minutes' THEN
            limit_value := plan_record.max_minutes;
        WHEN 'phone_numbers' THEN
            limit_value := plan_record.max_phone_numbers;
        ELSE
            RETURN false;
    END CASE;
    
    RETURN current_count < limit_value;
END;
$$ LANGUAGE plpgsql;