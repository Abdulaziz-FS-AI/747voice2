--
-- Call Analytics & Reporting System
-- Enhanced schema for capturing call data, structured responses, and AI analysis
--

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CALL TRANSCRIPTS TABLE
-- =============================================
CREATE TABLE call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    transcript_text TEXT,
    speakers JSONB DEFAULT '[]'::jsonb, -- Array of speaker objects
    word_timestamps JSONB DEFAULT '[]'::jsonb, -- Word-level timing data
    summary TEXT, -- AI-generated summary
    language VARCHAR(10) DEFAULT 'en-US',
    confidence_score DECIMAL(3,2), -- Overall transcript confidence
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    vapi_transcript_id VARCHAR(255), -- Vapi's transcript ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_status ON call_transcripts(processing_status);
CREATE INDEX idx_call_transcripts_created_at ON call_transcripts(created_at);

-- =============================================
-- LEAD RESPONSES TABLE
-- =============================================
CREATE TABLE lead_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assistant_questions(id) ON DELETE SET NULL,
    function_name VARCHAR(100), -- Vapi function name
    question_text TEXT NOT NULL,
    answer_value TEXT,
    answer_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, array
    answer_confidence DECIMAL(3,2), -- AI confidence in answer extraction
    field_name VARCHAR(100), -- structured field name (e.g., 'full_name')
    is_required BOOLEAN DEFAULT false,
    collection_method VARCHAR(20) DEFAULT 'function_call', -- function_call, transcript_analysis
    vapi_message_id VARCHAR(255), -- Vapi message ID
    collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_responses_call_id ON lead_responses(call_id);
CREATE INDEX idx_lead_responses_assistant_id ON lead_responses(assistant_id);
CREATE INDEX idx_lead_responses_field_name ON lead_responses(field_name);
CREATE INDEX idx_lead_responses_collected_at ON lead_responses(collected_at);

-- =============================================
-- CALL ANALYSIS TABLE
-- =============================================
CREATE TABLE call_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Lead Scoring
    lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
    qualification_status VARCHAR(20) DEFAULT 'unqualified', -- qualified, unqualified, needs_followup, hot_lead
    lead_quality VARCHAR(20) DEFAULT 'unknown', -- hot, warm, cold, unqualified
    
    -- Sentiment Analysis
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    sentiment_label VARCHAR(20), -- positive, negative, neutral
    emotional_tone VARCHAR(50), -- excited, frustrated, interested, confused, etc.
    
    -- Intent & Classification
    primary_intent VARCHAR(50), -- buying, selling, renting, investing, information
    secondary_intents TEXT[], -- additional intents detected
    property_type VARCHAR(50), -- residential, commercial, land, etc.
    urgency_level VARCHAR(20), -- immediate, soon, exploring, no_timeline
    budget_range VARCHAR(50), -- extracted budget information
    
    -- Conversation Analysis
    key_topics TEXT[], -- main topics discussed
    objections TEXT[], -- objections raised by caller
    pain_points TEXT[], -- identified pain points
    interests TEXT[], -- areas of interest
    
    -- Call Quality Metrics
    call_duration_seconds INTEGER,
    agent_talk_time_percentage DECIMAL(5,2), -- % of time agent was talking
    caller_engagement_score INTEGER CHECK (caller_engagement_score >= 0 AND caller_engagement_score <= 100),
    questions_answered INTEGER DEFAULT 0, -- number of questions successfully answered
    total_questions INTEGER DEFAULT 0, -- total questions asked
    
    -- AI-Generated Content
    ai_summary TEXT, -- comprehensive call summary
    next_steps TEXT, -- recommended follow-up actions 
    agent_notes TEXT, -- notes for human agents
    crm_notes TEXT, -- formatted notes for CRM sync
    
    -- Processing Info
    analysis_version VARCHAR(10) DEFAULT '1.0',
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    analysis_model VARCHAR(50) DEFAULT 'gpt-4', -- AI model used for analysis
    confidence_score DECIMAL(3,2), -- overall analysis confidence
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_analysis_call_id ON call_analysis(call_id);
CREATE INDEX idx_call_analysis_user_id ON call_analysis(user_id);
CREATE INDEX idx_call_analysis_lead_score ON call_analysis(lead_score);
CREATE INDEX idx_call_analysis_qualification_status ON call_analysis(qualification_status);
CREATE INDEX idx_call_analysis_primary_intent ON call_analysis(primary_intent);
CREATE INDEX idx_call_analysis_created_at ON call_analysis(created_at);

-- =============================================
-- WEBHOOK EVENTS LOG
-- =============================================
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL, -- call-start, call-end, function-call, etc.
    event_data JSONB NOT NULL, -- raw webhook payload
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    vapi_call_id VARCHAR(255), -- Vapi's call ID
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processed, failed, skipped
    error_message TEXT, -- error details if processing failed
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_call_id ON webhook_events(call_id);
CREATE INDEX idx_webhook_events_vapi_call_id ON webhook_events(vapi_call_id);
CREATE INDEX idx_webhook_events_processing_status ON webhook_events(processing_status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);

-- =============================================
-- ANALYSIS TRIGGERS
-- =============================================
CREATE TABLE analysis_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_type VARCHAR(50) NOT NULL, -- score_threshold, intent_match, keyword_detected
    trigger_config JSONB NOT NULL, -- configuration for the trigger
    action_type VARCHAR(50) NOT NULL, -- email_alert, crm_sync, webhook_call
    action_config JSONB NOT NULL, -- action configuration
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analysis_triggers_user_id ON analysis_triggers(user_id);
CREATE INDEX idx_analysis_triggers_trigger_type ON analysis_triggers(trigger_type);
CREATE INDEX idx_analysis_triggers_is_active ON analysis_triggers(is_active);

-- =============================================
-- UPDATE EXISTING CALLS TABLE
-- =============================================
-- Add new columns to existing calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcript_available BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS analysis_completed BOOLEAN DEFAULT false;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS vapi_call_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_rating INTEGER CHECK (call_rating >= 1 AND call_rating <= 5);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_tags TEXT[] DEFAULT '{}';

-- =============================================
-- UPDATE EXISTING LEADS TABLE  
-- =============================================
-- Add call analysis relationship
ALTER TABLE leads ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES call_analysis(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualification_date TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_transcripts
CREATE POLICY "Users can view their own call transcripts" ON call_transcripts
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own call transcripts" ON call_transcripts
    FOR INSERT WITH CHECK (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for lead_responses
CREATE POLICY "Users can view their own lead responses" ON lead_responses
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own lead responses" ON lead_responses
    FOR INSERT WITH CHECK (
        call_id IN (
            SELECT id FROM calls WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for call_analysis
CREATE POLICY "Users can view their own call analysis" ON call_analysis
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own call analysis" ON call_analysis
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own call analysis" ON call_analysis
    FOR UPDATE USING (user_id = auth.uid());

-- Webhook events - only accessible by service
CREATE POLICY "Service role can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Analysis triggers
CREATE POLICY "Users can manage their own analysis triggers" ON analysis_triggers
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to calculate lead score based on responses
CREATE OR REPLACE FUNCTION calculate_lead_score(call_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    base_score INTEGER := 0;
    contact_info_score INTEGER := 0;
    engagement_score INTEGER := 0;
    total_score INTEGER;
BEGIN
    -- Base score for completed call
    base_score := 20;
    
    -- Contact information score (0-40 points)
    SELECT 
        CASE 
            WHEN COUNT(*) >= 3 THEN 40
            WHEN COUNT(*) = 2 THEN 25
            WHEN COUNT(*) = 1 THEN 10
            ELSE 0
        END INTO contact_info_score
    FROM lead_responses 
    WHERE call_id = call_uuid 
    AND field_name IN ('full_name', 'phone_number', 'email')
    AND answer_value IS NOT NULL 
    AND answer_value != '';
    
    -- Engagement score based on questions answered (0-40 points)
    SELECT 
        CASE 
            WHEN COUNT(*) >= 5 THEN 40
            WHEN COUNT(*) >= 3 THEN 25
            WHEN COUNT(*) >= 1 THEN 15
            ELSE 0
        END INTO engagement_score
    FROM lead_responses 
    WHERE call_id = call_uuid 
    AND answer_value IS NOT NULL 
    AND answer_value != '';
    
    total_score := base_score + contact_info_score + engagement_score;
    
    -- Cap at 100
    IF total_score > 100 THEN
        total_score := 100;
    END IF;
    
    RETURN total_score;
END;
$$;

-- Function to update analysis timestamps
CREATE OR REPLACE FUNCTION update_analysis_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
CREATE TRIGGER update_call_analysis_timestamp
    BEFORE UPDATE ON call_analysis
    FOR EACH ROW EXECUTE FUNCTION update_analysis_timestamp();

CREATE TRIGGER update_call_transcripts_timestamp
    BEFORE UPDATE ON call_transcripts
    FOR EACH ROW EXECUTE FUNCTION update_analysis_timestamp();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Composite indexes for common queries
CREATE INDEX idx_call_analysis_user_score ON call_analysis(user_id, lead_score DESC);
CREATE INDEX idx_call_analysis_user_status ON call_analysis(user_id, qualification_status);
CREATE INDEX idx_lead_responses_call_field ON lead_responses(call_id, field_name);
CREATE INDEX idx_webhook_events_type_status ON webhook_events(event_type, processing_status);

-- Full-text search indexes
CREATE INDEX idx_call_transcripts_text_search ON call_transcripts USING gin(to_tsvector('english', transcript_text));
CREATE INDEX idx_call_analysis_summary_search ON call_analysis USING gin(to_tsvector('english', ai_summary));

-- JSONB indexes for efficient querying
CREATE INDEX idx_webhook_events_data_gin ON webhook_events USING gin(event_data);
CREATE INDEX idx_calls_vapi_data_gin ON calls USING gin(vapi_call_data);

-- Comments for documentation
COMMENT ON TABLE call_transcripts IS 'Stores conversation transcripts and AI-generated summaries';
COMMENT ON TABLE lead_responses IS 'Captures structured data responses from assistant questions';
COMMENT ON TABLE call_analysis IS 'AI analysis results including lead scoring and sentiment';
COMMENT ON TABLE webhook_events IS 'Log of all webhook events received from Vapi';
COMMENT ON TABLE analysis_triggers IS 'User-defined triggers for automated actions based on analysis results';
COMMENT ON FUNCTION calculate_lead_score IS 'Calculates lead score based on collected response data';
