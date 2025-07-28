-- Seed Data for Voice Matrix
-- This migration inserts initial configuration and sample data

-- =============================================
-- INITIAL CONFIGURATION
-- =============================================

-- Note: Voice configurations are handled directly in the assistants table via voice_id field
-- This connects to Vapi's voice system. Common voice IDs include:
-- - en-US-JennyNeural (Professional Female)
-- - en-US-AriaNeural (Friendly Female)  
-- - en-US-GuyNeural (Casual Male)
-- - en-US-DavisNeural (Professional Male)

-- =============================================
-- SAMPLE DATA (for development/testing)
-- =============================================

-- Only insert sample data in development environment
-- This should be skipped in production

DO $$
BEGIN
    -- Check if we're in a development environment
    -- In production, you would set up proper environment detection
    
    -- Sample team (only for development)
    INSERT INTO teams (
        id,
        name,
        slug,
        owner_id,
        plan_type,
        max_agents,
        max_assistants,
        max_minutes
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Demo Real Estate Agency',
        'demo-agency',
        '00000000-0000-0000-0000-000000000001', -- This would be a real auth.users.id
        'professional',
        5,
        3,
        5000
    ) ON CONFLICT (id) DO NOTHING;

    -- Sample profile (only for development)
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        company_name,
        phone,
        role,
        team_id,
        subscription_status,
        trial_ends_at,
        onboarding_completed
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        'demo@voicematrix.com',
        'John',
        'Smith',
        'Demo Real Estate Agency',
        '+1-555-0123',
        'admin',
        '00000000-0000-0000-0000-000000000001',
        'trial',
        NOW() + INTERVAL '14 days',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Sample assistant (only for development)
    INSERT INTO assistants (
        id,
        user_id,
        team_id,
        name,
        personality,
        company_name,
        max_call_duration,
        background_ambiance,
        voice_id,
        is_active,
        system_prompt,
        first_message,
        language
    ) VALUES (
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Sarah - Real Estate Assistant',
        'professional',
        'Demo Real Estate Agency',
        600,
        'office',
        'voice_professional_female_en',
        true,
        'You are Sarah, a professional real estate assistant for Demo Real Estate Agency. Your goal is to help potential clients with their real estate needs, qualify leads, and schedule appointments. Be helpful, knowledgeable, and professional. Always try to gather contact information and understand their specific needs.',
        'Hello! Thank you for calling Demo Real Estate Agency. This is Sarah, your AI assistant. I''m here to help you with all your real estate needs. How can I assist you today?',
        'en-US'
    ) ON CONFLICT (id) DO NOTHING;

END $$;

-- =============================================
-- CONFIGURATION TABLES
-- =============================================

-- Create configuration table for system settings
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
('default_call_duration', '300', 'Default maximum call duration in seconds'),
('default_lead_score_threshold', '70', 'Minimum score to consider a lead as qualified'),
('trial_duration_days', '14', 'Number of days for trial period'),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('supported_languages', '["en-US", "es-ES", "fr-FR", "de-DE"]', 'List of supported languages'),
('default_timezone', '"America/New_York"', 'Default timezone for the application'),
('analytics_retention_days', '365', 'Number of days to retain analytics data'),
('webhook_retry_attempts', '3', 'Number of times to retry failed webhook deliveries'),
('call_recording_enabled', 'true', 'Whether call recording is enabled by default'),
('lead_auto_score', 'true', 'Whether to automatically calculate lead scores')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_calls_date_range ON calls USING btree (created_at) WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days');
CREATE INDEX IF NOT EXISTS idx_leads_recent ON leads USING btree (created_at) WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
CREATE INDEX IF NOT EXISTS idx_leads_high_score ON leads USING btree (score) WHERE score >= 70;
CREATE INDEX IF NOT EXISTS idx_calls_successful ON calls USING btree (status, created_at) WHERE status = 'completed';

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for team dashboard statistics
CREATE OR REPLACE VIEW team_dashboard_stats AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    COUNT(DISTINCT p.id) as total_agents,
    COUNT(DISTINCT a.id) as total_assistants,
    COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) as active_assistants,
    COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days') as calls_last_30_days,
    COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days') as calls_last_7_days,
    COUNT(DISTINCT l.id) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days') as leads_last_30_days,
    COUNT(DISTINCT l.id) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days') as leads_last_7_days,
    COALESCE(SUM(c.duration) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as total_minutes_last_30_days,
    COALESCE(AVG(c.duration) FILTER (WHERE c.status = 'completed' AND c.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_call_duration_last_30_days,
    COALESCE(AVG(l.score) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as avg_lead_score_last_30_days
FROM teams t
LEFT JOIN profiles p ON p.team_id = t.id
LEFT JOIN assistants a ON a.team_id = t.id
LEFT JOIN calls c ON c.team_id = t.id
LEFT JOIN leads l ON l.team_id = t.id
GROUP BY t.id, t.name;

-- View for lead pipeline
CREATE OR REPLACE VIEW lead_pipeline AS
SELECT 
    l.*,
    p.first_name as agent_first_name,
    p.last_name as agent_last_name,
    c.duration as call_duration,
    c.created_at as call_date,
    a.name as assistant_name,
    CASE 
        WHEN l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at < NOW() THEN 'overdue'
        WHEN l.next_follow_up_at IS NOT NULL AND l.next_follow_up_at <= NOW() + INTERVAL '24 hours' THEN 'due_soon'
        ELSE 'scheduled'
    END as follow_up_status
FROM leads l
LEFT JOIN profiles p ON p.id = l.user_id
LEFT JOIN calls c ON c.id = l.call_id
LEFT JOIN assistants a ON a.id = c.assistant_id;

-- View for call analytics
CREATE OR REPLACE VIEW call_analytics AS
SELECT 
    c.*,
    a.name as assistant_name,
    a.personality as assistant_personality,
    p.first_name as agent_first_name,
    p.last_name as agent_last_name,
    t.name as team_name,
    CASE 
        WHEN c.duration > 0 THEN c.cost / (c.duration / 60.0)
        ELSE 0
    END as cost_per_minute,
    CASE 
        WHEN c.status = 'completed' THEN 'successful'
        WHEN c.status IN ('failed', 'busy', 'no_answer') THEN 'unsuccessful'
        ELSE 'in_progress'
    END as call_outcome
FROM calls c
LEFT JOIN assistants a ON a.id = c.assistant_id
LEFT JOIN profiles p ON p.id = c.user_id
LEFT JOIN teams t ON t.id = c.team_id;

-- Grant necessary permissions for views
GRANT SELECT ON team_dashboard_stats TO authenticated;
GRANT SELECT ON lead_pipeline TO authenticated;
GRANT SELECT ON call_analytics TO authenticated;