-- Call Analytics & Business Intelligence System
-- Transforms call_logs data into actionable insights

-- =============================================
-- ANALYTICS TABLES
-- =============================================

-- Enhanced call_analytics table with more metrics
ALTER TABLE call_analytics ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0;
ALTER TABLE call_analytics ADD COLUMN IF NOT EXISTS avg_evaluation_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE call_analytics ADD COLUMN IF NOT EXISTS top_topics TEXT[];
ALTER TABLE call_analytics ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) DEFAULT 0;

-- Create leads table from structured_data
CREATE TABLE IF NOT EXISTS extracted_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES user_assistants(id),
    
    -- Contact Information
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    
    -- Lead Details
    lead_score INTEGER DEFAULT 0,
    lead_quality TEXT DEFAULT 'unknown', -- hot, warm, cool, cold
    intent TEXT, -- buying, selling, renting, investing
    budget_range TEXT,
    timeline TEXT,
    location TEXT,
    property_type TEXT,
    
    -- Extracted from call
    call_duration_seconds INTEGER,
    call_cost_cents INTEGER,
    evaluation_score DECIMAL(5,2),
    summary TEXT,
    
    -- Metadata
    extraction_confidence DECIMAL(3,2) DEFAULT 0,
    source_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(call_log_id)
);

-- Create conversation insights table
CREATE TABLE IF NOT EXISTS conversation_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_log_id UUID REFERENCES call_logs(id) ON DELETE CASCADE UNIQUE,
    
    -- Conversation Metrics
    word_count INTEGER,
    question_count INTEGER,
    positive_words INTEGER DEFAULT 0,
    negative_words INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2) DEFAULT 0,
    
    -- Topics & Intent
    detected_topics TEXT[],
    primary_intent TEXT,
    secondary_intents TEXT[],
    
    -- Quality Indicators
    engagement_score INTEGER DEFAULT 0, -- 0-100
    information_completeness INTEGER DEFAULT 0, -- 0-100
    objection_count INTEGER DEFAULT 0,
    
    -- Key Phrases
    key_phrases TEXT[],
    customer_concerns TEXT[],
    positive_indicators TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SMART EXTRACTION FUNCTIONS
-- =============================================

-- Extract leads from structured_data and evaluation
CREATE OR REPLACE FUNCTION extract_lead_from_call(call_log_id UUID)
RETURNS UUID AS $$
DECLARE
    call_data RECORD;
    lead_id UUID;
    v_lead_score INTEGER := 0;
    v_lead_quality TEXT := 'cold';
    v_confidence DECIMAL := 0.5;
BEGIN
    -- Get call data
    SELECT * INTO call_data FROM call_logs WHERE id = call_log_id;
    
    IF call_data IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate lead score based on multiple factors
    
    -- Duration score (0-25 points)
    IF call_data.duration_seconds >= 300 THEN -- 5+ minutes
        v_lead_score := v_lead_score + 25;
        v_confidence := v_confidence + 0.2;
    ELSIF call_data.duration_seconds >= 120 THEN -- 2+ minutes
        v_lead_score := v_lead_score + 15;
        v_confidence := v_confidence + 0.1;
    ELSIF call_data.duration_seconds >= 60 THEN -- 1+ minute
        v_lead_score := v_lead_score + 5;
    END IF;
    
    -- Evaluation score (0-30 points)
    IF call_data.success_evaluation IS NOT NULL AND call_data.success_evaluation != '{}' THEN
        v_lead_score := v_lead_score + 20;
        v_confidence := v_confidence + 0.2;
        
        -- Try to extract numeric evaluation score
        IF (call_data.success_evaluation->>'score')::DECIMAL > 0.8 THEN
            v_lead_score := v_lead_score + 10;
            v_confidence := v_confidence + 0.1;
        END IF;
    END IF;
    
    -- Structured data completeness (0-25 points)
    IF call_data.structured_data IS NOT NULL AND call_data.structured_data != '{}' THEN
        v_lead_score := v_lead_score + 15;
        v_confidence := v_confidence + 0.15;
        
        -- Bonus for contact info
        IF call_data.structured_data ? 'email' OR call_data.structured_data ? 'phone' THEN
            v_lead_score := v_lead_score + 10;
            v_confidence := v_confidence + 0.15;
        END IF;
    END IF;
    
    -- Transcript analysis bonus (0-20 points)
    IF call_data.transcript IS NOT NULL AND LENGTH(call_data.transcript) > 100 THEN
        v_lead_score := v_lead_score + 10;
        
        -- Look for buying signals
        IF call_data.transcript ~* '(interested|ready|budget|timeline|when|schedule|view|buy|purchase)' THEN
            v_lead_score := v_lead_score + 10;
            v_confidence := v_confidence + 0.1;
        END IF;
    END IF;
    
    -- Determine lead quality
    IF v_lead_score >= 80 THEN
        v_lead_quality := 'hot';
    ELSIF v_lead_score >= 60 THEN
        v_lead_quality := 'warm';
    ELSIF v_lead_score >= 40 THEN
        v_lead_quality := 'cool';
    ELSE
        v_lead_quality := 'cold';
    END IF;
    
    -- Insert extracted lead
    INSERT INTO extracted_leads (
        call_log_id,
        assistant_id,
        first_name,
        last_name,
        email,
        phone,
        company,
        lead_score,
        lead_quality,
        intent,
        budget_range,
        timeline,
        location,
        property_type,
        call_duration_seconds,
        call_cost_cents,
        evaluation_score,
        summary,
        extraction_confidence,
        source_fields
    ) VALUES (
        call_log_id,
        call_data.assistant_id,
        COALESCE(
            call_data.structured_data->>'firstName',
            call_data.structured_data->>'first_name',
            split_part(call_data.structured_data->>'name', ' ', 1)
        ),
        COALESCE(
            call_data.structured_data->>'lastName', 
            call_data.structured_data->>'last_name',
            split_part(call_data.structured_data->>'name', ' ', 2)
        ),
        COALESCE(
            call_data.structured_data->>'email',
            call_data.structured_data->>'emailAddress'
        ),
        COALESCE(
            call_data.structured_data->>'phone',
            call_data.structured_data->>'phoneNumber'
        ),
        call_data.structured_data->>'company',
        v_lead_score,
        v_lead_quality,
        COALESCE(call_data.structured_data->>'intent', 'unknown'),
        call_data.structured_data->>'budget',
        call_data.structured_data->>'timeline',
        call_data.structured_data->>'location',
        call_data.structured_data->>'propertyType',
        call_data.duration_seconds,
        call_data.cost_cents,
        (call_data.success_evaluation->>'score')::DECIMAL,
        call_data.summary,
        LEAST(1.0, v_confidence),
        call_data.structured_data
    ) ON CONFLICT (call_log_id) DO UPDATE SET
        lead_score = EXCLUDED.lead_score,
        lead_quality = EXCLUDED.lead_quality,
        extraction_confidence = EXCLUDED.extraction_confidence,
        updated_at = NOW()
    RETURNING id INTO lead_id;
    
    RETURN lead_id;
END;
$$ LANGUAGE plpgsql;

-- Analyze conversation and extract insights
CREATE OR REPLACE FUNCTION analyze_conversation(call_log_id UUID)
RETURNS UUID AS $$
DECLARE
    call_data RECORD;
    v_word_count INTEGER := 0;
    v_question_count INTEGER := 0;
    v_positive_words INTEGER := 0;
    v_negative_words INTEGER := 0;
    v_sentiment DECIMAL := 0;
    v_topics TEXT[] := '{}';
    v_intent TEXT := 'unknown';
    v_engagement INTEGER := 50;
    insight_id UUID;
BEGIN
    SELECT * INTO call_data FROM call_logs WHERE id = call_log_id;
    
    IF call_data.transcript IS NULL OR call_data.transcript = '' THEN
        RETURN NULL;
    END IF;
    
    -- Basic text analysis
    v_word_count := array_length(string_to_array(call_data.transcript, ' '), 1);
    v_question_count := array_length(string_to_array(call_data.transcript, '?'), 1) - 1;
    
    -- Sentiment analysis (simple keyword matching)
    v_positive_words := (
        SELECT COALESCE(
            array_length(string_to_array(lower(call_data.transcript), 'great'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'good'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'excellent'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'perfect'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'interested'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'yes'), 1) - 1,
            0
        )
    );
    
    v_negative_words := (
        SELECT COALESCE(
            array_length(string_to_array(lower(call_data.transcript), 'no'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'not'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'bad'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'expensive'), 1) - 1 +
            array_length(string_to_array(lower(call_data.transcript), 'difficult'), 1) - 1,
            0
        )
    );
    
    -- Calculate sentiment score (-1 to 1)
    IF v_positive_words + v_negative_words > 0 THEN
        v_sentiment := ROUND(
            ((v_positive_words - v_negative_words)::DECIMAL / 
            (v_positive_words + v_negative_words)::DECIMAL)::NUMERIC, 2
        );
    END IF;
    
    -- Topic detection
    IF call_data.transcript ~* '(buy|buying|purchase|invest)' THEN
        v_topics := array_append(v_topics, 'buying');
        v_intent := 'buying';
    END IF;
    
    IF call_data.transcript ~* '(sell|selling|list)' THEN
        v_topics := array_append(v_topics, 'selling');
        IF v_intent = 'unknown' THEN v_intent := 'selling'; END IF;
    END IF;
    
    IF call_data.transcript ~* '(rent|rental|lease)' THEN
        v_topics := array_append(v_topics, 'renting');
        IF v_intent = 'unknown' THEN v_intent := 'renting'; END IF;
    END IF;
    
    IF call_data.transcript ~* '(price|cost|budget|afford)' THEN
        v_topics := array_append(v_topics, 'pricing');
    END IF;
    
    IF call_data.transcript ~* '(location|area|neighborhood|address)' THEN
        v_topics := array_append(v_topics, 'location');
    END IF;
    
    -- Engagement score (based on conversation length and questions)
    v_engagement := LEAST(100, 
        (call_data.duration_seconds / 10) + -- 1 point per 10 seconds
        (v_question_count * 5) + -- 5 points per question
        (v_word_count / 20) -- 1 point per 20 words
    );
    
    -- Insert insights
    INSERT INTO conversation_insights (
        call_log_id,
        word_count,
        question_count,
        positive_words,
        negative_words,
        sentiment_score,
        detected_topics,
        primary_intent,
        engagement_score
    ) VALUES (
        call_log_id,
        v_word_count,
        v_question_count,
        v_positive_words,
        v_negative_words,
        v_sentiment,
        v_topics,
        v_intent,
        v_engagement
    ) ON CONFLICT (call_log_id) DO UPDATE SET
        word_count = EXCLUDED.word_count,
        question_count = EXCLUDED.question_count,
        positive_words = EXCLUDED.positive_words,
        negative_words = EXCLUDED.negative_words,
        sentiment_score = EXCLUDED.sentiment_score,
        detected_topics = EXCLUDED.detected_topics,
        primary_intent = EXCLUDED.primary_intent,
        engagement_score = EXCLUDED.engagement_score
    RETURNING id INTO insight_id;
    
    RETURN insight_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTOMATED TRIGGERS
-- =============================================

-- Auto-process new calls
CREATE OR REPLACE FUNCTION auto_process_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract lead information
    PERFORM extract_lead_from_call(NEW.id);
    
    -- Analyze conversation
    PERFORM analyze_conversation(NEW.id);
    
    -- Update call_analytics
    PERFORM update_daily_analytics(NEW.assistant_id, DATE(NEW.started_at));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on new call inserts
DROP TRIGGER IF EXISTS trigger_auto_process_call ON call_logs;
CREATE TRIGGER trigger_auto_process_call
    AFTER INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_process_call();

-- Update analytics function
CREATE OR REPLACE FUNCTION update_daily_analytics(p_assistant_id UUID, p_date DATE)
RETURNS VOID AS $$
DECLARE
    v_stats RECORD;
BEGIN
    -- Calculate daily stats
    SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE call_status = 'completed') as successful_calls,
        COUNT(*) FILTER (WHERE call_status != 'completed') as failed_calls,
        ROUND(SUM(duration_seconds) / 60.0) as total_duration_minutes,
        SUM(cost_cents) as total_cost_cents,
        ROUND(AVG(duration_seconds) / 60.0, 2) as average_call_duration,
        ROUND(
            (COUNT(*) FILTER (WHERE call_status = 'completed')::DECIMAL / COUNT(*) * 100), 2
        ) as success_rate,
        COUNT(el.id) as leads_generated,
        ROUND(AVG((cl.success_evaluation->>'score')::DECIMAL), 2) as avg_evaluation_score,
        ROUND(AVG(ci.sentiment_score), 2) as sentiment_score
    INTO v_stats
    FROM call_logs cl
    LEFT JOIN extracted_leads el ON cl.id = el.call_log_id
    LEFT JOIN conversation_insights ci ON cl.id = ci.call_log_id
    WHERE cl.assistant_id = p_assistant_id
      AND DATE(cl.started_at) = p_date;
    
    -- Upsert into call_analytics
    INSERT INTO call_analytics (
        assistant_id, date, total_calls, successful_calls, failed_calls,
        total_duration_minutes, total_cost_cents, average_call_duration,
        success_rate, leads_generated, avg_evaluation_score, sentiment_score
    ) VALUES (
        p_assistant_id, p_date, v_stats.total_calls, v_stats.successful_calls,
        v_stats.failed_calls, v_stats.total_duration_minutes, v_stats.total_cost_cents,
        v_stats.average_call_duration, v_stats.success_rate, v_stats.leads_generated,
        v_stats.avg_evaluation_score, v_stats.sentiment_score
    )
    ON CONFLICT (assistant_id, date) DO UPDATE SET
        total_calls = v_stats.total_calls,
        successful_calls = v_stats.successful_calls,
        failed_calls = v_stats.failed_calls,
        total_duration_minutes = v_stats.total_duration_minutes,
        total_cost_cents = v_stats.total_cost_cents,
        average_call_duration = v_stats.average_call_duration,
        success_rate = v_stats.success_rate,
        leads_generated = v_stats.leads_generated,
        avg_evaluation_score = v_stats.avg_evaluation_score,
        sentiment_score = v_stats.sentiment_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DASHBOARD VIEWS
-- =============================================

-- Real-time performance dashboard
CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
    DATE(cl.started_at) as call_date,
    ua.name as assistant_name,
    COUNT(*) as total_calls,
    COUNT(el.id) as leads_generated,
    ROUND((COUNT(el.id)::DECIMAL / COUNT(*) * 100), 1) as conversion_rate,
    
    -- Quality Metrics
    COUNT(*) FILTER (WHERE el.lead_quality = 'hot') as hot_leads,
    COUNT(*) FILTER (WHERE el.lead_quality = 'warm') as warm_leads,
    COUNT(*) FILTER (WHERE el.lead_quality = 'cool') as cool_leads,
    ROUND(AVG(el.lead_score), 1) as avg_lead_score,
    
    -- Performance Metrics
    ROUND(AVG(cl.duration_seconds / 60.0), 1) as avg_duration_minutes,
    ROUND(AVG(cl.cost_cents / 100.0), 2) as avg_cost_dollars,
    ROUND(SUM(cl.cost_cents) / 100.0, 2) as total_cost_dollars,
    
    -- Conversation Quality
    ROUND(AVG(ci.sentiment_score), 2) as avg_sentiment,
    ROUND(AVG(ci.engagement_score), 1) as avg_engagement,
    
    -- ROI Calculation
    ROUND(
        (COUNT(el.id) * 100.0) / NULLIF(SUM(cl.cost_cents / 100.0), 0), 2
    ) as leads_per_dollar

FROM call_logs cl
LEFT JOIN user_assistants ua ON cl.assistant_id = ua.id
LEFT JOIN extracted_leads el ON cl.id = el.call_log_id
LEFT JOIN conversation_insights ci ON cl.id = ci.call_log_id
WHERE cl.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(cl.started_at), ua.name, ua.id
ORDER BY call_date DESC, total_calls DESC;

-- Lead quality analysis
CREATE OR REPLACE VIEW lead_analysis AS
SELECT 
    el.*,
    ua.name as assistant_name,
    cl.started_at as call_time,
    ci.sentiment_score,
    ci.engagement_score,
    ci.detected_topics,
    ci.primary_intent,
    
    -- Lead scoring breakdown
    CASE 
        WHEN el.lead_score >= 80 THEN 'Contact Immediately'
        WHEN el.lead_score >= 60 THEN 'Follow up within 24h'
        WHEN el.lead_score >= 40 THEN 'Add to nurture campaign'
        ELSE 'Low priority follow-up'
    END as recommended_action
    
FROM extracted_leads el
JOIN call_logs cl ON el.call_log_id = cl.id
LEFT JOIN user_assistants ua ON el.assistant_id = ua.id
LEFT JOIN conversation_insights ci ON cl.id = ci.call_log_id
ORDER BY el.lead_score DESC, cl.started_at DESC;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_extracted_leads_quality ON extracted_leads(lead_quality);
CREATE INDEX IF NOT EXISTS idx_extracted_leads_score ON extracted_leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_insights_sentiment ON conversation_insights(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_conversation_insights_engagement ON conversation_insights(engagement_score);

-- Enable RLS
ALTER TABLE extracted_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view extracted leads" ON extracted_leads
    FOR SELECT USING (
        assistant_id IN (
            SELECT id FROM user_assistants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view conversation insights" ON conversation_insights
    FOR SELECT USING (
        call_log_id IN (
            SELECT cl.id FROM call_logs cl
            JOIN user_assistants ua ON cl.assistant_id = ua.id
            WHERE ua.user_id = auth.uid()
        )
    );