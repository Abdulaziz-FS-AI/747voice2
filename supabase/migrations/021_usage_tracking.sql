-- Usage Tracking and Cost Management
-- This migration adds comprehensive usage tracking for VAPI costs and billing

-- =============================================
-- USAGE TRACKING TABLES
-- =============================================

-- Usage periods table - track billing periods
CREATE TABLE usage_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    total_calls INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- seconds
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    ai_model_cost DECIMAL(10,4) DEFAULT 0.0000,
    transcription_cost DECIMAL(10,4) DEFAULT 0.0000,
    tts_cost DECIMAL(10,4) DEFAULT 0.0000, -- text-to-speech
    phone_cost DECIMAL(10,4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, period_start, period_end)
);

-- Daily usage snapshots for detailed tracking
CREATE TABLE daily_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    calls_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0, -- seconds
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    ai_model_cost DECIMAL(10,4) DEFAULT 0.0000,
    transcription_cost DECIMAL(10,4) DEFAULT 0.0000,
    tts_cost DECIMAL(10,4) DEFAULT 0.0000,
    phone_cost DECIMAL(10,4) DEFAULT 0.0000,
    average_call_cost DECIMAL(10,4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, usage_date)
);

-- Cost breakdown per call (detailed VAPI cost data)
CREATE TABLE call_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    -- VAPI cost breakdown
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    ai_model_cost DECIMAL(10,4) DEFAULT 0.0000,
    ai_model_tokens INTEGER DEFAULT 0,
    transcription_cost DECIMAL(10,4) DEFAULT 0.0000,
    transcription_duration INTEGER DEFAULT 0, -- seconds
    tts_cost DECIMAL(10,4) DEFAULT 0.0000,
    tts_characters INTEGER DEFAULT 0,
    phone_cost DECIMAL(10,4) DEFAULT 0.0000,
    phone_duration INTEGER DEFAULT 0, -- seconds
    
    -- Raw VAPI cost data
    vapi_cost_data JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage alerts for cost monitoring
CREATE TABLE usage_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'cost_threshold', 'usage_limit', 'daily_spike'
    threshold_value DECIMAL(10,4) NOT NULL,
    current_value DECIMAL(10,4) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- UPDATE EXISTING TABLES
-- =============================================

-- Add additional cost tracking fields to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS vapi_call_data JSONB;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS ai_model_cost DECIMAL(10,4) DEFAULT 0.0000;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcription_cost DECIMAL(10,4) DEFAULT 0.0000;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS tts_cost DECIMAL(10,4) DEFAULT 0.0000;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS phone_cost DECIMAL(10,4) DEFAULT 0.0000;

-- Add usage tracking to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_period_calls INTEGER DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS current_period_cost DECIMAL(10,4) DEFAULT 0.0000;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS cost_alert_threshold DECIMAL(10,4) DEFAULT 100.00; -- $100 default alert

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Usage periods indexes
CREATE INDEX idx_usage_periods_team_period ON usage_periods(team_id, period_start, period_end);
CREATE INDEX idx_usage_periods_dates ON usage_periods(period_start, period_end);

-- Daily usage indexes
CREATE INDEX idx_daily_usage_team_date ON daily_usage(team_id, usage_date DESC);
CREATE INDEX idx_daily_usage_date ON daily_usage(usage_date DESC);

-- Call costs indexes
CREATE INDEX idx_call_costs_call_id ON call_costs(call_id);
CREATE INDEX idx_call_costs_team_date ON call_costs(team_id, created_at DESC);

-- Usage alerts indexes
CREATE INDEX idx_usage_alerts_team_unresolved ON usage_alerts(team_id, is_resolved, created_at DESC);

-- Calls table cost indexes
CREATE INDEX idx_calls_cost_tracking ON calls(team_id, created_at DESC, cost);

-- =============================================
-- FUNCTIONS FOR USAGE CALCULATIONS
-- =============================================

-- Function to calculate current period usage for a team
CREATE OR REPLACE FUNCTION get_team_current_usage(team_uuid UUID)
RETURNS TABLE (
    total_calls INTEGER,
    total_duration INTEGER,
    total_cost DECIMAL(10,4),
    ai_model_cost DECIMAL(10,4),
    transcription_cost DECIMAL(10,4),
    tts_cost DECIMAL(10,4),
    phone_cost DECIMAL(10,4),
    period_start TIMESTAMPTZ
) AS $$
BEGIN
    -- Get team's current period start
    SELECT current_period_start INTO period_start
    FROM teams 
    WHERE id = team_uuid;
    
    -- Calculate usage from current period start
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_calls,
        COALESCE(SUM(c.duration), 0)::INTEGER as total_duration,
        COALESCE(SUM(c.cost), 0.0000)::DECIMAL(10,4) as total_cost,
        COALESCE(SUM(c.ai_model_cost), 0.0000)::DECIMAL(10,4) as ai_model_cost,
        COALESCE(SUM(c.transcription_cost), 0.0000)::DECIMAL(10,4) as transcription_cost,
        COALESCE(SUM(c.tts_cost), 0.0000)::DECIMAL(10,4) as tts_cost,
        COALESCE(SUM(c.phone_cost), 0.0000)::DECIMAL(10,4) as phone_cost,
        period_start
    FROM calls c
    WHERE c.team_id = team_uuid 
      AND c.created_at >= period_start;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily usage snapshot
CREATE OR REPLACE FUNCTION update_daily_usage_snapshot(team_uuid UUID, target_date DATE)
RETURNS VOID AS $$
DECLARE
    usage_data RECORD;
BEGIN
    -- Calculate daily usage
    SELECT 
        COUNT(*) as calls_count,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(SUM(cost), 0.0000) as total_cost,
        COALESCE(SUM(ai_model_cost), 0.0000) as ai_model_cost,
        COALESCE(SUM(transcription_cost), 0.0000) as transcription_cost,
        COALESCE(SUM(tts_cost), 0.0000) as tts_cost,
        COALESCE(SUM(phone_cost), 0.0000) as phone_cost,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(cost), 0.0000) / COUNT(*)
            ELSE 0.0000
        END as average_call_cost
    INTO usage_data
    FROM calls
    WHERE team_id = team_uuid 
      AND DATE(created_at) = target_date;

    -- Insert or update daily usage
    INSERT INTO daily_usage (
        team_id, usage_date, calls_count, total_duration, total_cost,
        ai_model_cost, transcription_cost, tts_cost, phone_cost, average_call_cost
    )
    VALUES (
        team_uuid, target_date, usage_data.calls_count, usage_data.total_duration, usage_data.total_cost,
        usage_data.ai_model_cost, usage_data.transcription_cost, usage_data.tts_cost, 
        usage_data.phone_cost, usage_data.average_call_cost
    )
    ON CONFLICT (team_id, usage_date) DO UPDATE SET
        calls_count = usage_data.calls_count,
        total_duration = usage_data.total_duration,
        total_cost = usage_data.total_cost,
        ai_model_cost = usage_data.ai_model_cost,
        transcription_cost = usage_data.transcription_cost,
        tts_cost = usage_data.tts_cost,
        phone_cost = usage_data.phone_cost,
        average_call_cost = usage_data.average_call_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check and create usage alerts
CREATE OR REPLACE FUNCTION check_usage_alerts(team_uuid UUID)
RETURNS VOID AS $$
DECLARE
    team_data RECORD;
    current_usage RECORD;
BEGIN
    -- Get team alert settings
    SELECT cost_alert_threshold, current_period_start
    INTO team_data
    FROM teams
    WHERE id = team_uuid;
    
    -- Get current usage
    SELECT * INTO current_usage
    FROM get_team_current_usage(team_uuid);
    
    -- Check cost threshold alert
    IF current_usage.total_cost >= team_data.cost_alert_threshold THEN
        INSERT INTO usage_alerts (
            team_id, alert_type, threshold_value, current_value,
            period_start, period_end
        )
        VALUES (
            team_uuid, 'cost_threshold', team_data.cost_alert_threshold, current_usage.total_cost,
            team_data.current_period_start, NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update team current usage when call is updated
CREATE OR REPLACE FUNCTION update_team_usage_on_call_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update team's current period stats
    UPDATE teams SET
        current_period_calls = (
            SELECT COUNT(*) FROM calls 
            WHERE team_id = NEW.team_id 
              AND created_at >= current_period_start
        ),
        current_period_cost = (
            SELECT COALESCE(SUM(cost), 0) FROM calls 
            WHERE team_id = NEW.team_id 
              AND created_at >= current_period_start
        ),
        updated_at = NOW()
    WHERE id = NEW.team_id;
    
    -- Update daily usage snapshot
    PERFORM update_daily_usage_snapshot(NEW.team_id, DATE(NEW.created_at));
    
    -- Check for usage alerts
    PERFORM check_usage_alerts(NEW.team_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to calls table
DROP TRIGGER IF EXISTS trigger_update_team_usage ON calls;
CREATE TRIGGER trigger_update_team_usage
    AFTER INSERT OR UPDATE OF cost, duration, ai_model_cost, transcription_cost, tts_cost, phone_cost
    ON calls
    FOR EACH ROW
    EXECUTE FUNCTION update_team_usage_on_call_change();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Usage periods policies
ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's usage periods" ON usage_periods
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Daily usage policies
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's daily usage" ON daily_usage
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Call costs policies
ALTER TABLE call_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's call costs" ON call_costs
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Usage alerts policies
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their team's usage alerts" ON usage_alerts
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their team's usage alerts" ON usage_alerts
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- INITIAL DATA
-- =============================================

-- Set current period start for existing teams
UPDATE teams 
SET current_period_start = COALESCE(created_at, NOW())
WHERE current_period_start IS NULL;