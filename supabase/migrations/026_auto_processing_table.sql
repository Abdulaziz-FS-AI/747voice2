-- Auto-Processing Table for Make.com Data
-- Single table that receives raw data and automatically processes it

-- =============================================
-- MAIN INTAKE TABLE
-- =============================================

-- This table receives ALL data from Make.com
CREATE TABLE incoming_call_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Raw fields from Make.com (exactly as they come in)
    time_field TIMESTAMPTZ,
    summary_field TEXT,
    success_evaluation JSONB,
    structured_data JSONB,
    cost_field DECIMAL(10,4),
    duration_minutes INTEGER,
    transcript_field TEXT,
    assistant_id_field TEXT,
    assistant_name_field TEXT,
    
    -- Additional optional fields
    phone_number TEXT,
    call_status TEXT DEFAULT 'completed',
    
    -- Auto-populated fields
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    processing_errors TEXT,
    
    -- Auto-extracted analytics
    has_contact_info BOOLEAN DEFAULT FALSE,
    lead_quality_score INTEGER DEFAULT 0,
    sentiment_score DECIMAL(3,2) DEFAULT 0,
    call_intent TEXT,
    
    -- Extracted contact info
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_company TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_incoming_call_data_received_at ON incoming_call_data(received_at DESC);
CREATE INDEX idx_incoming_call_data_processed ON incoming_call_data(processed);
CREATE INDEX idx_incoming_call_data_has_contact ON incoming_call_data(has_contact_info) WHERE has_contact_info = TRUE;

-- =============================================
-- AUTO-PROCESSING TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION auto_process_incoming_call()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_assistant_uuid UUID;
    v_lead_score INTEGER := 0;
    v_sentiment DECIMAL(3,2) := 0;
    v_intent TEXT := 'general';
    v_contact_info JSONB;
BEGIN
    -- Get user from assistant
    SELECT user_id, id INTO v_user_id, v_assistant_uuid
    FROM assistants
    WHERE vapi_assistant_id = NEW.assistant_id_field
       OR name = NEW.assistant_name_field
    LIMIT 1;
    
    -- Fallback to first user
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- Extract contact information from structured_data
    IF NEW.structured_data IS NOT NULL THEN
        v_contact_info := NEW.structured_data;
        
        NEW.contact_name := COALESCE(
            v_contact_info->>'name',
            v_contact_info->>'fullName',
            v_contact_info->>'customerName'
        );
        
        NEW.contact_email := COALESCE(
            v_contact_info->>'email',
            v_contact_info->>'emailAddress'
        );
        
        NEW.contact_phone := COALESCE(
            v_contact_info->>'phone',
            v_contact_info->>'phoneNumber',
            NEW.phone_number
        );
        
        NEW.contact_company := v_contact_info->>'company';
    END IF;
    
    -- Also try to extract from transcript using regex
    IF NEW.contact_email IS NULL AND NEW.transcript_field IS NOT NULL THEN
        NEW.contact_email := substring(NEW.transcript_field from '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}');
    END IF;
    
    IF NEW.contact_phone IS NULL AND NEW.transcript_field IS NOT NULL THEN
        NEW.contact_phone := substring(NEW.transcript_field from '\+?1?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})');
    END IF;
    
    -- Set contact info flag
    NEW.has_contact_info := (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL);
    
    -- Calculate lead score (0-100)
    IF NEW.has_contact_info THEN
        v_lead_score := v_lead_score + 30;
    END IF;
    
    -- Duration score
    IF NEW.duration_minutes >= 5 THEN
        v_lead_score := v_lead_score + 25;
    ELSIF NEW.duration_minutes >= 2 THEN
        v_lead_score := v_lead_score + 15;
    ELSIF NEW.duration_minutes >= 1 THEN
        v_lead_score := v_lead_score + 10;
    END IF;
    
    -- Success evaluation score
    IF NEW.success_evaluation IS NOT NULL THEN
        v_lead_score := v_lead_score + 20;
        
        -- Try to extract numeric scores
        IF (NEW.success_evaluation->>'score')::NUMERIC > 0.7 THEN
            v_lead_score := v_lead_score + 15;
        END IF;
    END IF;
    
    -- Analyze transcript for intent and sentiment
    IF NEW.transcript_field IS NOT NULL THEN
        v_lead_score := v_lead_score + 10; -- Has transcript
        
        -- Simple sentiment analysis
        IF NEW.transcript_field ~* '(interested|excited|ready|perfect|great|love|yes|definitely)' THEN
            v_sentiment := 0.7;
            v_lead_score := v_lead_score + 15;
        ELSIF NEW.transcript_field ~* '(not interested|no|maybe|unsure|expensive|wait)' THEN
            v_sentiment := -0.3;
        ELSE
            v_sentiment := 0.2;
        END IF;
        
        -- Intent detection
        IF NEW.transcript_field ~* '(view|showing|tour|visit|see.{0,20}property)' THEN
            v_intent := 'schedule_viewing';
        ELSIF NEW.transcript_field ~* '(immediately|asap|today|now|urgent)' THEN
            v_intent := 'immediate_interest';
        ELSIF NEW.transcript_field ~* '(price|cost|expensive|budget|afford)' THEN
            v_intent := 'price_inquiry';
        ELSIF NEW.transcript_field ~* '(information|details|tell me|know more)' THEN
            v_intent := 'information_request';
        END IF;
    END IF;
    
    NEW.lead_quality_score := LEAST(100, v_lead_score);
    NEW.sentiment_score := v_sentiment;
    NEW.call_intent := v_intent;
    NEW.processed := TRUE;
    
    -- Auto-create lead if high quality
    IF NEW.has_contact_info AND NEW.lead_quality_score >= 40 THEN
        INSERT INTO leads (
            user_id,
            first_name,
            last_name,
            email,
            phone,
            company,
            lead_source,
            status,
            score,
            priority,
            notes
        ) VALUES (
            v_user_id,
            COALESCE(split_part(NEW.contact_name, ' ', 1), 'Unknown'),
            split_part(NEW.contact_name, ' ', 2),
            NEW.contact_email,
            NEW.contact_phone,
            NEW.contact_company,
            'voice_call',
            'new',
            NEW.lead_quality_score,
            CASE
                WHEN NEW.lead_quality_score >= 80 THEN 'hot'
                WHEN NEW.lead_quality_score >= 60 THEN 'warm'
                ELSE 'cool'
            END,
            jsonb_build_object(
                'call_summary', NEW.summary_field,
                'call_intent', NEW.call_intent,
                'call_duration', NEW.duration_minutes,
                'sentiment', NEW.sentiment_score
            )::TEXT
        ) ON CONFLICT (email) DO UPDATE SET
            score = GREATEST(leads.score, NEW.lead_quality_score),
            updated_at = NOW();
    END IF;
    
    -- Update call record if exists
    UPDATE calls SET
        cost = COALESCE(NEW.cost_field, cost),
        duration = COALESCE(NEW.duration_minutes * 60, duration),
        status = COALESCE(NEW.call_status, status),
        ended_at = COALESCE(NEW.time_field, ended_at),
        updated_at = NOW()
    WHERE assistant_id = v_assistant_uuid
      AND created_at::DATE = NEW.time_field::DATE
      AND ABS(EXTRACT(EPOCH FROM (created_at - NEW.time_field))) < 3600; -- Within 1 hour
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    NEW.processing_errors := SQLERRM;
    NEW.processed := FALSE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER
-- =============================================

-- Auto-process every new row
CREATE TRIGGER trigger_auto_process_call
    BEFORE INSERT ON incoming_call_data
    FOR EACH ROW
    EXECUTE FUNCTION auto_process_incoming_call();

-- =============================================
-- ANALYTICS VIEWS
-- =============================================

-- Real-time stats view
CREATE OR REPLACE VIEW call_stats_dashboard AS
SELECT 
    DATE(received_at) as call_date,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE has_contact_info) as calls_with_leads,
    ROUND(AVG(lead_quality_score), 1) as avg_lead_score,
    ROUND(AVG(sentiment_score), 2) as avg_sentiment,
    AVG(duration_minutes) as avg_duration_minutes,
    SUM(cost_field) as total_cost,
    
    -- Intent breakdown
    COUNT(*) FILTER (WHERE call_intent = 'immediate_interest') as immediate_interest_calls,
    COUNT(*) FILTER (WHERE call_intent = 'schedule_viewing') as viewing_requests,
    COUNT(*) FILTER (WHERE call_intent = 'price_inquiry') as price_inquiries,
    COUNT(*) FILTER (WHERE call_intent = 'information_request') as info_requests,
    
    -- Quality breakdown
    COUNT(*) FILTER (WHERE lead_quality_score >= 80) as hot_leads,
    COUNT(*) FILTER (WHERE lead_quality_score >= 60 AND lead_quality_score < 80) as warm_leads,
    COUNT(*) FILTER (WHERE lead_quality_score >= 40 AND lead_quality_score < 60) as cool_leads,
    COUNT(*) FILTER (WHERE lead_quality_score < 40) as cold_calls
    
FROM incoming_call_data
WHERE processed = TRUE
GROUP BY DATE(received_at)
ORDER BY call_date DESC;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE incoming_call_data ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for Make.com)
CREATE POLICY "Allow anonymous inserts" ON incoming_call_data
    FOR INSERT TO anon
    WITH CHECK (true);

-- Users can view their data
CREATE POLICY "Users can view their call data" ON incoming_call_data
    FOR SELECT USING (
        assistant_id_field IN (
            SELECT vapi_assistant_id FROM assistants WHERE user_id = auth.uid()
        )
        OR assistant_name_field IN (
            SELECT name FROM assistants WHERE user_id = auth.uid()
        )
    );