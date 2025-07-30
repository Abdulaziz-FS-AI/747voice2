-- Dynamic Call Processing System
-- Handles variable JSON structures from VAPI end call reports

-- =============================================
-- CORE TABLES
-- =============================================

-- Raw call data storage (data lake pattern)
CREATE TABLE IF NOT EXISTS call_data_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id TEXT UNIQUE NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Raw JSON from Make.com (stores EVERYTHING)
    raw_data JSONB NOT NULL,
    
    -- Extracted metadata for fast queries
    assistant_id UUID REFERENCES assistants(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    call_duration INTEGER,
    call_status TEXT,
    call_started_at TIMESTAMPTZ,
    call_ended_at TIMESTAMPTZ,
    
    -- Dynamic extracted data
    extracted_questions JSONB DEFAULT '{}', -- {q1: "answer1", q2: "answer2"}
    extracted_evaluations JSONB DEFAULT '{}', -- {metric1: score1, metric2: score2}
    extracted_entities JSONB DEFAULT '{}', -- {name: "John", budget: 500000}
    
    -- Analytics flags
    has_lead BOOLEAN DEFAULT FALSE,
    sentiment_score DECIMAL(3,2), -- -1 to 1
    intent_detected TEXT[],
    
    -- Processing status
    processed_at TIMESTAMPTZ,
    processing_errors JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_call_data_raw_user_id ON call_data_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_call_data_raw_call_id ON call_data_raw(call_id);
CREATE INDEX IF NOT EXISTS idx_call_data_raw_received_at ON call_data_raw(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_data_raw_has_lead ON call_data_raw(has_lead) WHERE has_lead = TRUE;

-- =============================================
-- MAIN PROCESSING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION process_call_json(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    new_id UUID;
    v_user_id UUID;
    v_assistant_id UUID;
    extracted_data JSONB;
BEGIN
    -- Extract user_id from assistant
    SELECT a.user_id, a.id INTO v_user_id, v_assistant_id
    FROM assistants a
    WHERE a.vapi_assistant_id = input_json->>'assistantId'
    LIMIT 1;
    
    -- If no assistant found, try to extract user_id from the JSON
    IF v_user_id IS NULL THEN
        v_user_id := COALESCE(
            (input_json->>'userId')::UUID,
            (SELECT id FROM auth.users LIMIT 1) -- Fallback for single-user system
        );
    END IF;
    
    -- Store raw data
    INSERT INTO call_data_raw (
        call_id,
        raw_data,
        user_id,
        assistant_id,
        call_duration,
        call_status,
        call_started_at,
        call_ended_at
    ) VALUES (
        COALESCE(input_json->>'callId', input_json->>'id', gen_random_uuid()::TEXT),
        input_json,
        v_user_id,
        v_assistant_id,
        COALESCE((input_json->>'duration')::INTEGER, 0),
        COALESCE(input_json->>'status', 'unknown'),
        CASE 
            WHEN input_json->>'startedAt' IS NOT NULL 
            THEN (input_json->>'startedAt')::TIMESTAMPTZ
            ELSE NOW() 
        END,
        CASE 
            WHEN input_json->>'endedAt' IS NOT NULL 
            THEN (input_json->>'endedAt')::TIMESTAMPTZ
            ELSE NOW() 
        END
    ) 
    ON CONFLICT (call_id) DO UPDATE SET
        raw_data = input_json,
        updated_at = NOW()
    RETURNING id INTO new_id;
    
    -- Extract questions/answers from various possible locations
    extracted_data := COALESCE(
        input_json->'questions',
        input_json->'analysis'->'questions',
        input_json->'messages'->-1->'toolCalls'->0->'function'->'arguments'->'questions',
        '{}'::JSONB
    );
    
    UPDATE call_data_raw SET
        extracted_questions = extracted_data
    WHERE id = new_id;
    
    -- Extract evaluations/scores
    extracted_data := COALESCE(
        input_json->'evaluations',
        input_json->'analysis'->'scores',
        input_json->'analysis'->'evaluation',
        input_json->'metrics',
        '{}'::JSONB
    );
    
    UPDATE call_data_raw SET
        extracted_evaluations = extracted_data
    WHERE id = new_id;
    
    -- Extract entities (lead information)
    UPDATE call_data_raw SET
        extracted_entities = jsonb_build_object(
            'caller_name', COALESCE(
                input_json#>>'{customer,name}',
                input_json#>>'{analysis,structuredData,name}',
                input_json#>>'{transcript,speakerName}',
                input_json->>'callerName'
            ),
            'email', COALESCE(
                input_json#>>'{customer,email}',
                input_json#>>'{analysis,structuredData,email}',
                input_json#>>'{analysis,extractedData,email}'
            ),
            'phone', COALESCE(
                input_json#>>'{customer,number}',
                input_json#>>'{analysis,structuredData,phone}',
                input_json->>'phoneNumber'
            ),
            'budget', COALESCE(
                (input_json#>>'{analysis,structuredData,budget}')::NUMERIC,
                (input_json#>>'{analysis,extractedData,budget}')::NUMERIC
            ),
            'location', COALESCE(
                input_json#>>'{analysis,structuredData,location}',
                input_json#>>'{analysis,extractedData,location}'
            ),
            'property_type', COALESCE(
                input_json#>>'{analysis,structuredData,propertyType}',
                input_json#>>'{analysis,extractedData,propertyType}'
            )
        )
    WHERE id = new_id;
    
    -- Determine if this call generated a lead
    UPDATE call_data_raw SET
        has_lead = CASE 
            WHEN extracted_entities->>'email' IS NOT NULL 
              OR extracted_entities->>'phone' IS NOT NULL 
              OR extracted_questions->>'email' IS NOT NULL
              OR extracted_questions->>'phone' IS NOT NULL
            THEN TRUE 
            ELSE FALSE 
        END,
        processed_at = NOW()
    WHERE id = new_id;
    
    -- Create lead record if we have contact info
    IF EXISTS (
        SELECT 1 FROM call_data_raw 
        WHERE id = new_id 
        AND has_lead = TRUE
    ) THEN
        PERFORM create_lead_from_raw_call(new_id);
    END IF;
    
    -- Update call record if it exists
    PERFORM update_call_from_raw_data(new_id);
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'call_data_id', new_id,
        'has_lead', (SELECT has_lead FROM call_data_raw WHERE id = new_id),
        'message', 'Call data processed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error and return failure
    UPDATE call_data_raw SET
        processing_errors = jsonb_build_object(
            'error', SQLERRM,
            'detail', SQLSTATE,
            'timestamp', NOW()
        )
    WHERE id = new_id;
    
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to process call data'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Create lead from raw call data
CREATE OR REPLACE FUNCTION create_lead_from_raw_call(raw_call_id UUID)
RETURNS UUID AS $$
DECLARE
    v_lead_id UUID;
    v_call_data RECORD;
BEGIN
    SELECT * INTO v_call_data
    FROM call_data_raw
    WHERE id = raw_call_id;
    
    -- Check if lead already exists
    SELECT id INTO v_lead_id
    FROM leads
    WHERE (email = v_call_data.extracted_entities->>'email' 
       OR phone = v_call_data.extracted_entities->>'phone')
      AND user_id = v_call_data.user_id
    LIMIT 1;
    
    IF v_lead_id IS NULL THEN
        -- Create new lead
        INSERT INTO leads (
            user_id,
            first_name,
            last_name,
            email,
            phone,
            lead_source,
            status,
            property_type,
            budget_min,
            budget_max,
            preferred_locations,
            notes
        ) VALUES (
            v_call_data.user_id,
            COALESCE(
                split_part(v_call_data.extracted_entities->>'caller_name', ' ', 1),
                v_call_data.extracted_questions->>'firstName',
                'Unknown'
            ),
            COALESCE(
                split_part(v_call_data.extracted_entities->>'caller_name', ' ', 2),
                v_call_data.extracted_questions->>'lastName'
            ),
            COALESCE(
                v_call_data.extracted_entities->>'email',
                v_call_data.extracted_questions->>'email'
            ),
            COALESCE(
                v_call_data.extracted_entities->>'phone',
                v_call_data.extracted_questions->>'phone'
            ),
            'voice_call',
            'new',
            CASE 
                WHEN v_call_data.extracted_entities->>'property_type' IS NOT NULL 
                THEN ARRAY[v_call_data.extracted_entities->>'property_type']
                ELSE NULL
            END,
            (v_call_data.extracted_entities->>'budget')::NUMERIC,
            (v_call_data.extracted_entities->>'budget')::NUMERIC,
            CASE 
                WHEN v_call_data.extracted_entities->>'location' IS NOT NULL 
                THEN ARRAY[v_call_data.extracted_entities->>'location']
                ELSE NULL
            END,
            'Lead generated from call ' || v_call_data.call_id
        ) RETURNING id INTO v_lead_id;
    END IF;
    
    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Update existing call record with processed data
CREATE OR REPLACE FUNCTION update_call_from_raw_data(raw_call_id UUID)
RETURNS VOID AS $$
DECLARE
    v_call_data RECORD;
BEGIN
    SELECT * INTO v_call_data
    FROM call_data_raw
    WHERE id = raw_call_id;
    
    -- Update existing call record if it exists
    UPDATE calls SET
        cost = COALESCE((v_call_data.raw_data->>'cost')::DECIMAL, cost),
        duration = COALESCE(v_call_data.call_duration, duration),
        status = COALESCE(v_call_data.call_status, status),
        ended_at = v_call_data.call_ended_at,
        updated_at = NOW()
    WHERE vapi_call_id = v_call_data.call_id;
    
    -- Store transcript if available
    IF v_call_data.raw_data->>'transcript' IS NOT NULL THEN
        INSERT INTO call_transcripts (
            call_id,
            transcript_text,
            processing_status
        )
        SELECT 
            c.id,
            v_call_data.raw_data->>'transcript',
            'completed'
        FROM calls c
        WHERE c.vapi_call_id = v_call_data.call_id
        ON CONFLICT (call_id) DO UPDATE SET
            transcript_text = v_call_data.raw_data->>'transcript',
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ANALYTICS VIEWS
-- =============================================

-- Create view for call analytics
CREATE OR REPLACE VIEW call_analytics_dashboard AS
SELECT 
    DATE(received_at) as call_date,
    user_id,
    assistant_id,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE has_lead) as calls_with_leads,
    AVG(call_duration) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE call_status = 'completed') as completed_calls,
    
    -- Extract common questions
    jsonb_object_agg(
        q.key,
        COUNT(*) FILTER (WHERE q.value IS NOT NULL AND q.value != 'null'::jsonb)
    ) as question_response_rates,
    
    -- Extract evaluation scores
    jsonb_object_agg(
        e.key,
        AVG((e.value)::NUMERIC) FILTER (WHERE jsonb_typeof(e.value) = 'number')
    ) as avg_evaluation_scores
    
FROM call_data_raw
LEFT JOIN LATERAL jsonb_each(extracted_questions) q ON true
LEFT JOIN LATERAL jsonb_each(extracted_evaluations) e ON true
WHERE processed_at IS NOT NULL
GROUP BY DATE(received_at), user_id, assistant_id;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE call_data_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call data" ON call_data_raw
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own call data" ON call_data_raw
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Grant execute permission on the main function
GRANT EXECUTE ON FUNCTION process_call_json(JSONB) TO anon, authenticated;