-- Make.com Integration for VAPI Call Data
-- Handles the specific structure from Make.com with direct field mapping

-- =============================================
-- SIMPLIFIED PROCESSING FUNCTION FOR MAKE.COM
-- =============================================

CREATE OR REPLACE FUNCTION process_make_call_data(
    -- Direct parameters from Make.com mapping
    p_time TIMESTAMPTZ DEFAULT NULL,
    p_summary TEXT DEFAULT NULL,
    p_success_evaluation JSONB DEFAULT NULL,
    p_structured_data JSONB DEFAULT NULL,
    p_cost DECIMAL DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_transcript TEXT DEFAULT NULL,
    p_assistant_id TEXT DEFAULT NULL,
    p_assistant_name TEXT DEFAULT NULL,
    -- Additional fields you might add
    p_call_id TEXT DEFAULT NULL,
    p_phone_number TEXT DEFAULT NULL,
    p_raw_json JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_assistant_uuid UUID;
    v_call_id TEXT;
    v_new_id UUID;
    v_lead_data JSONB;
BEGIN
    -- Generate call ID
    v_call_id := COALESCE(p_call_id, 'make_' || gen_random_uuid()::TEXT);
    
    -- Get user from assistant
    SELECT user_id, id INTO v_user_id, v_assistant_uuid
    FROM assistants
    WHERE vapi_assistant_id = p_assistant_id
       OR name = p_assistant_name
    LIMIT 1;
    
    -- Fallback to default user
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- Store the call data
    INSERT INTO call_data_raw (
        call_id,
        user_id,
        assistant_id,
        call_started_at,
        call_ended_at,
        call_duration,
        cost,
        call_status,
        raw_data,
        extracted_questions,
        extracted_evaluations,
        extracted_entities
    ) VALUES (
        v_call_id,
        v_user_id,
        v_assistant_uuid,
        p_time,
        p_time + (COALESCE(p_duration_minutes, 0) || ' minutes')::INTERVAL,
        COALESCE(p_duration_minutes, 0) * 60, -- Convert to seconds
        COALESCE(p_cost, 0),
        'completed',
        COALESCE(p_raw_json, jsonb_build_object(
            'time', p_time,
            'summary', p_summary,
            'transcript', p_transcript,
            'cost', p_cost,
            'duration_minutes', p_duration_minutes,
            'assistant_id', p_assistant_id,
            'assistant_name', p_assistant_name
        )),
        -- Extract questions from structured data
        CASE 
            WHEN p_structured_data ? 'questions' THEN p_structured_data->'questions'
            ELSE '{}'::JSONB
        END,
        -- Store success evaluation
        COALESCE(p_success_evaluation, '{}'::JSONB),
        -- Extract lead info from structured data
        CASE 
            WHEN p_structured_data IS NOT NULL THEN
                jsonb_build_object(
                    'name', p_structured_data->>'name',
                    'email', p_structured_data->>'email',
                    'phone', p_structured_data->>'phone',
                    'company', p_structured_data->>'company',
                    'role', p_structured_data->>'role',
                    'budget', p_structured_data->>'budget',
                    'timeline', p_structured_data->>'timeline',
                    'location', p_structured_data->>'location',
                    'notes', p_structured_data->>'notes'
                )
            ELSE '{}'::JSONB
        END
    ) RETURNING id INTO v_new_id;
    
    -- Check if we have lead data
    v_lead_data := (SELECT extracted_entities FROM call_data_raw WHERE id = v_new_id);
    
    IF v_lead_data->>'email' IS NOT NULL OR v_lead_data->>'phone' IS NOT NULL THEN
        -- Mark as having lead
        UPDATE call_data_raw 
        SET has_lead = TRUE, processed_at = NOW()
        WHERE id = v_new_id;
        
        -- Create lead record
        INSERT INTO leads (
            user_id,
            first_name,
            last_name,
            email,
            phone,
            company,
            lead_source,
            status,
            notes,
            call_id
        ) VALUES (
            v_user_id,
            COALESCE(
                split_part(v_lead_data->>'name', ' ', 1),
                'Unknown'
            ),
            split_part(v_lead_data->>'name', ' ', 2),
            v_lead_data->>'email',
            v_lead_data->>'phone',
            v_lead_data->>'company',
            'voice_call',
            'new',
            jsonb_build_object(
                'role', v_lead_data->>'role',
                'budget', v_lead_data->>'budget',
                'timeline', v_lead_data->>'timeline',
                'location', v_lead_data->>'location',
                'original_notes', v_lead_data->>'notes',
                'summary', p_summary
            )::TEXT,
            (SELECT id FROM calls WHERE vapi_call_id = v_call_id LIMIT 1)
        ) ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(EXCLUDED.phone, leads.phone),
            company = COALESCE(EXCLUDED.company, leads.company),
            updated_at = NOW();
    ELSE
        UPDATE call_data_raw 
        SET has_lead = FALSE, processed_at = NOW()
        WHERE id = v_new_id;
    END IF;
    
    -- Store transcript if available
    IF p_transcript IS NOT NULL AND p_transcript != '' THEN
        INSERT INTO call_transcripts (
            call_id,
            transcript_text,
            processing_status
        )
        SELECT 
            c.id,
            p_transcript,
            'completed'
        FROM calls c
        WHERE c.vapi_call_id = v_call_id
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'call_data_id', v_new_id,
        'call_id', v_call_id,
        'has_lead', (SELECT has_lead FROM call_data_raw WHERE id = v_new_id),
        'lead_created', (v_lead_data->>'email' IS NOT NULL OR v_lead_data->>'phone' IS NOT NULL),
        'message', 'Call data processed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'message', 'Failed to process call data'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ALTERNATIVE: SINGLE JSON PARAMETER VERSION
-- =============================================

CREATE OR REPLACE FUNCTION process_make_json_bundle(input_data JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Extract fields and call the main function
    RETURN process_make_call_data(
        p_time => (input_data->>'time')::TIMESTAMPTZ,
        p_summary => input_data->>'summary',
        p_success_evaluation => input_data->'successEvaluation',
        p_structured_data => input_data->'StructuredData',
        p_cost => (input_data->>'cost')::DECIMAL,
        p_duration_minutes => (input_data->>'DurationMin')::INTEGER,
        p_transcript => input_data->>'transcript',
        p_assistant_id => input_data->'id'->>'id',
        p_assistant_name => input_data->'name'->>'name',
        p_raw_json => input_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_make_call_data(
    TIMESTAMPTZ, TEXT, JSONB, JSONB, DECIMAL, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION process_make_json_bundle(JSONB) TO anon, authenticated;