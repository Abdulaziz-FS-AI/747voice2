-- Row Level Security Policies for Voice Matrix
-- This migration enables RLS and creates comprehensive security policies

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TEAMS POLICIES
-- =============================================

-- Teams: Users can view teams they belong to
CREATE POLICY "Users can view their own teams" ON teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ) OR owner_id = auth.uid()
    );

-- Teams: Only team owners can update their teams
CREATE POLICY "Team owners can update their teams" ON teams
    FOR UPDATE USING (owner_id = auth.uid());

-- Teams: Only authenticated users can create teams
CREATE POLICY "Authenticated users can create teams" ON teams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Teams: Only team owners can delete their teams
CREATE POLICY "Team owners can delete their teams" ON teams
    FOR DELETE USING (owner_id = auth.uid());

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Profiles: Users can view profiles in their team
CREATE POLICY "Users can view team member profiles" ON profiles
    FOR SELECT USING (
        id = auth.uid() OR 
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Profiles: Team admins can update team member profiles
CREATE POLICY "Team admins can update member profiles" ON profiles
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles: Authenticated users can insert their own profile
CREATE POLICY "Users can create their own profile" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Profiles: Team admins can delete team member profiles (except their own)
CREATE POLICY "Team admins can delete member profiles" ON profiles
    FOR DELETE USING (
        id != auth.uid() AND
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- PHONE NUMBERS POLICIES
-- =============================================

-- Phone Numbers: Team members can view team phone numbers
CREATE POLICY "Team members can view phone numbers" ON phone_numbers
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Phone Numbers: Team admins can manage phone numbers
CREATE POLICY "Team admins can manage phone numbers" ON phone_numbers
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- ASSISTANTS POLICIES
-- =============================================

-- Assistants: Team members can view team assistants
CREATE POLICY "Team members can view assistants" ON assistants
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Assistants: Users can create assistants for their team
CREATE POLICY "Users can create assistants" ON assistants
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        (team_id IS NULL OR team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ))
    );

-- Assistants: Users can update their own assistants or team admins can update team assistants
CREATE POLICY "Users can update assistants" ON assistants
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'agent')
        ))
    );

-- Assistants: Users can delete their own assistants or team admins can delete team assistants
CREATE POLICY "Users can delete assistants" ON assistants
    FOR DELETE USING (
        user_id = auth.uid() OR
        (team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ))
    );

-- =============================================
-- CALLS POLICIES
-- =============================================

-- Calls: Team members can view team calls
CREATE POLICY "Team members can view calls" ON calls
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Calls: Users can create calls for their assistants
CREATE POLICY "Users can create calls" ON calls
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        assistant_id IN (
            SELECT id FROM assistants 
            WHERE user_id = auth.uid() OR team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- Calls: Users can update their own calls or team members can update team calls
CREATE POLICY "Users can update calls" ON calls
    FOR UPDATE USING (
        user_id = auth.uid() OR
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- =============================================
-- CALL TRANSCRIPTS POLICIES
-- =============================================

-- Call Transcripts: Team members can view transcripts for team calls
CREATE POLICY "Team members can view call transcripts" ON call_transcripts
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM calls 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            ) OR user_id = auth.uid()
        )
    );

-- Call Transcripts: System can insert transcripts for team calls
CREATE POLICY "System can create call transcripts" ON call_transcripts
    FOR INSERT WITH CHECK (
        call_id IN (
            SELECT id FROM calls 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            ) OR user_id = auth.uid()
        )
    );

-- =============================================
-- LEADS POLICIES
-- =============================================

-- Leads: Team members can view team leads
CREATE POLICY "Team members can view leads" ON leads
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ) OR user_id = auth.uid()
    );

-- Leads: Users can create leads for their team
CREATE POLICY "Users can create leads" ON leads
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        (team_id IS NULL OR team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        ))
    );

-- Leads: Team members can update team leads
CREATE POLICY "Team members can update leads" ON leads
    FOR UPDATE USING (
        user_id = auth.uid() OR
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
    );

-- Leads: Team admins can delete leads
CREATE POLICY "Team admins can delete leads" ON leads
    FOR DELETE USING (
        user_id = auth.uid() OR
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- LEAD INTERACTIONS POLICIES
-- =============================================

-- Lead Interactions: Team members can view interactions for team leads
CREATE POLICY "Team members can view lead interactions" ON lead_interactions
    FOR SELECT USING (
        lead_id IN (
            SELECT id FROM leads 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            ) OR user_id = auth.uid()
        )
    );

-- Lead Interactions: Users can create interactions for accessible leads
CREATE POLICY "Users can create lead interactions" ON lead_interactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        lead_id IN (
            SELECT id FROM leads 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            ) OR user_id = auth.uid()
        )
    );

-- Lead Interactions: Users can update their own interactions
CREATE POLICY "Users can update their interactions" ON lead_interactions
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- AUDIT LOGS POLICIES
-- =============================================

-- Audit Logs: Team admins can view team audit logs
CREATE POLICY "Team admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        ) OR user_id = auth.uid()
    );

-- Audit Logs: System can insert audit logs
CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- ANALYTICS SNAPSHOTS POLICIES
-- =============================================

-- Analytics: Team members can view team analytics
CREATE POLICY "Team members can view analytics" ON analytics_snapshots
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Analytics: System can insert/update analytics snapshots
CREATE POLICY "System can manage analytics snapshots" ON analytics_snapshots
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'agent')
        )
    );

-- =============================================
-- HELPER FUNCTIONS FOR POLICIES
-- =============================================

-- Function to check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND team_id = team_id 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has team access
CREATE OR REPLACE FUNCTION has_team_access(user_id UUID, team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND team_id = team_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;