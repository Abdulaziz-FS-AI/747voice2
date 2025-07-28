-- Simplify Voice Matrix to Single User Architecture
-- This migration removes team-based functionality and implements single-tier payment

-- =============================================
-- DISABLE RLS TEMPORARILY
-- =============================================
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers DISABLE ROW LEVEL SECURITY;
ALTER TABLE assistants DISABLE ROW LEVEL SECURITY;
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots DISABLE ROW LEVEL SECURITY;

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================
DROP POLICY IF EXISTS "Users can view their own teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Team admins can update member profiles" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Team admins can delete member profiles" ON profiles;
DROP POLICY IF EXISTS "Team members can view phone numbers" ON phone_numbers;
DROP POLICY IF EXISTS "Team admins can manage phone numbers" ON phone_numbers;
DROP POLICY IF EXISTS "Team members can view assistants" ON assistants;
DROP POLICY IF EXISTS "Users can create assistants" ON assistants;
DROP POLICY IF EXISTS "Users can update assistants" ON assistants;
DROP POLICY IF EXISTS "Users can delete assistants" ON assistants;
DROP POLICY IF EXISTS "Team members can view calls" ON calls;
DROP POLICY IF EXISTS "Users can create calls" ON calls;
DROP POLICY IF EXISTS "Users can update calls" ON calls;
DROP POLICY IF EXISTS "Team members can view call transcripts" ON call_transcripts;
DROP POLICY IF EXISTS "System can create call transcripts" ON call_transcripts;
DROP POLICY IF EXISTS "Team members can view leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Team members can update leads" ON leads;
DROP POLICY IF EXISTS "Team admins can delete leads" ON leads;
DROP POLICY IF EXISTS "Team members can view lead interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Users can create lead interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Users can update their interactions" ON lead_interactions;
DROP POLICY IF EXISTS "Team admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Team members can view analytics" ON analytics_snapshots;
DROP POLICY IF EXISTS "System can manage analytics snapshots" ON analytics_snapshots;

-- =============================================
-- REMOVE TEAM COLUMNS AND CONSTRAINTS
-- =============================================

-- Remove team references from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS team_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;

-- Remove team references from phone_numbers
ALTER TABLE phone_numbers DROP COLUMN IF EXISTS team_id CASCADE;

-- Remove team references from assistants  
ALTER TABLE assistants DROP COLUMN IF EXISTS team_id CASCADE;

-- Remove team references from calls
ALTER TABLE calls DROP COLUMN IF EXISTS team_id CASCADE;

-- Remove team references from leads
ALTER TABLE leads DROP COLUMN IF EXISTS team_id CASCADE;

-- Remove team references from analytics_snapshots
ALTER TABLE analytics_snapshots DROP COLUMN IF EXISTS team_id CASCADE;

-- =============================================
-- SIMPLIFY PROFILES TABLE
-- =============================================

-- Add subscription columns directly to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255); -- Stripe subscription ID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status subscription_status NOT NULL DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE;

-- Add usage limits directly to profiles (single tier)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_assistants INTEGER NOT NULL DEFAULT 3;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_minutes INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_phone_numbers INTEGER NOT NULL DEFAULT 1;

-- =============================================
-- DROP TEAMS TABLE AND RELATED TYPES
-- =============================================

-- Drop functions that reference teams
DROP FUNCTION IF EXISTS is_team_admin(UUID, UUID);
DROP FUNCTION IF EXISTS has_team_access(UUID, UUID);
DROP FUNCTION IF EXISTS get_team_usage(UUID);

-- Drop teams table
DROP TABLE IF EXISTS teams CASCADE;

-- Drop team-related types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;

-- =============================================
-- UPDATE ANALYTICS TABLE
-- =============================================

-- Add user_id to analytics for individual tracking
ALTER TABLE analytics_snapshots ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE;

-- Update analytics unique constraint
DROP INDEX IF EXISTS analytics_snapshots_team_id_date_period_type_key;
CREATE UNIQUE INDEX analytics_snapshots_user_date_period ON analytics_snapshots(user_id, date, period_type);

-- =============================================
-- CREATE NEW SIMPLIFIED RLS POLICIES
-- =============================================

-- Profiles: Users can view/update their own profile only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Phone Numbers: Users can only manage their own phone numbers
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own phone numbers" ON phone_numbers
    FOR ALL USING (user_id = auth.uid());

-- Assistants: Users can only access their own assistants
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own assistants" ON assistants
    FOR ALL USING (user_id = auth.uid());

-- Calls: Users can only access their own calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calls" ON calls
    FOR ALL USING (user_id = auth.uid());

-- Call Transcripts: Users can only access transcripts for their calls
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own leads" ON leads
    FOR ALL USING (user_id = auth.uid());

-- Lead Interactions: Users can only access interactions for their leads
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lead interactions" ON lead_interactions
    FOR ALL USING (
        user_id = auth.uid() OR
        lead_id IN (
            SELECT id FROM leads WHERE user_id = auth.uid()
        )
    );

-- Audit Logs: Users can only view their own audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Analytics: Users can only view their own analytics
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON analytics_snapshots
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage user analytics" ON analytics_snapshots
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- UPDATE HELPER FUNCTIONS
-- =============================================

-- Function to get user usage statistics (replaces team usage)
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

-- =============================================
-- UPDATE INDEXES
-- =============================================

-- Drop team-based indexes
DROP INDEX IF EXISTS idx_profiles_team_id;
DROP INDEX IF EXISTS idx_assistants_team_id;
DROP INDEX IF EXISTS idx_calls_team_id;
DROP INDEX IF EXISTS idx_leads_team_id;
DROP INDEX IF EXISTS idx_analytics_team_date;

-- Add user-based indexes for performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_snapshots(user_id, date);

-- =============================================
-- DATA MIGRATION (if needed)
-- =============================================

-- If there's existing data, you might need to:
-- 1. Assign all data to specific users
-- 2. Set default subscription status
-- 3. Update any hardcoded team references

-- Example: Update existing profiles to premium if they had paid teams
-- UPDATE profiles SET is_premium = true, subscription_status = 'active' 
-- WHERE id IN (SELECT owner_id FROM teams WHERE plan_type != 'starter');