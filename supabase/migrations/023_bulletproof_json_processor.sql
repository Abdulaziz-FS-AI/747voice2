-- Bulletproof JSON Processing System
-- Handles ANY JSON structure, no matter how messy or nested

-- =============================================
-- ENHANCED PROCESSING FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION process_call_json(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    new_id UUID;
    v_user_id UUID;
    v_assistant_id UUID;
    v_call_id TEXT;
    error_details JSONB;
BEGIN
    -- Wrap EVERYTHING in exception handling
    BEGIN
        -- Generate a call ID no matter what
        v_call_id := COALESCE(
            input_json->>'callId',
            input_json->>'id', 
            input_json->>'call_id',
            input_json->'call'->>'id',
            input_json->'data'->>'callId',
            'manual_' || gen_random_uuid()::TEXT
        );
        
        -- Try multiple paths to find user_id
        BEGIN
            -- First try: via assistant
            SELECT a.user_id, a.id INTO v_user_id, v_assistant_id
            FROM assistants a
            WHERE a.vapi_assistant_id = ANY(ARRAY[
                input_json->>'assistantId',
                input_json->'assistant'->>'id',
                input_json->'data'->>'assistantId'
            ])
            LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            -- Continue with null
            NULL;
        END;
        
        -- Fallback: get any user_id
        IF v_user_id IS NULL THEN
            v_user_id := COALESCE(
                (input_json->>'userId')::UUID,
                (input_json->'user'->>'id')::UUID,
                (SELECT id FROM auth.users WHERE email IS NOT NULL LIMIT 1),
                (SELECT id FROM auth.users LIMIT 1)
            );
        END IF;
        
        -- If STILL no user_id, create a system user
        IF v_user_id IS NULL THEN
            INSERT INTO auth.users (id, email) 
            VALUES (gen_random_uuid(), 'system@voicematrix.ai')
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_user_id;
            
            -- If still null, get the system user
            IF v_user_id IS NULL THEN
                SELECT id INTO v_user_id 
                FROM auth.users 
                WHERE email = 'system@voicematrix.ai' 
                LIMIT 1;
            END IF;
        END IF;
        
        -- Store raw data (this MUST succeed)
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
            v_call_id,
            input_json,
            v_user_id,
            v_assistant_id,
            extract_number_safely(input_json, ARRAY['duration', 'call_duration', 'callDuration']),
            extract_text_safely(input_json, ARRAY['status', 'callStatus', 'call_status']),
            extract_timestamp_safely(input_json, ARRAY['startedAt', 'started_at', 'startTime']),
            extract_timestamp_safely(input_json, ARRAY['endedAt', 'ended_at', 'endTime'])
        ) 
        ON CONFLICT (call_id) DO UPDATE SET
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        RETURNING id INTO new_id;
        
        -- Try to extract data (but don't fail if we can't)
        BEGIN
            PERFORM safe_extract_questions(new_id, input_json);
            PERFORM safe_extract_evaluations(new_id, input_json);
            PERFORM safe_extract_entities(new_id, input_json);
            PERFORM safe_detect_lead(new_id);
            
            UPDATE call_data_raw 
            SET processed_at = NOW() 
            WHERE id = new_id;
        EXCEPTION WHEN OTHERS THEN
            -- Log extraction error but continue
            UPDATE call_data_raw SET
                processing_errors = jsonb_build_object(
                    'extraction_error', SQLERRM,
                    'phase', 'data_extraction'
                )
            WHERE id = new_id;
        END;
        
        -- Return success
        RETURN jsonb_build_object(
            'success', true,
            'call_data_id', new_id,
            'call_id', v_call_id,
            'message', 'Call data stored successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Even if EVERYTHING fails, try to save the raw JSON
        BEGIN
            INSERT INTO call_data_raw (
                call_id,
                raw_data,
                user_id,
                processing_errors
            ) VALUES (
                'error_' || gen_random_uuid()::TEXT,
                input_json,
                (SELECT id FROM auth.users LIMIT 1),
                jsonb_build_object(
                    'critical_error', SQLERRM,
                    'detail', SQLSTATE,
                    'timestamp', NOW()
                )
            ) RETURNING id INTO new_id;
            
            RETURN jsonb_build_object(
                'success', false,
                'call_data_id', new_id,
                'error', SQLERRM,
                'message', 'Data saved with errors'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Absolute worst case: return error
            RETURN jsonb_build_object(
                'success', false,
                'error', SQLERRM,
                'message', 'Critical failure - could not save data'
            );
        END;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAFE EXTRACTION HELPERS
-- =============================================

-- Safely extract number from multiple possible paths
CREATE OR REPLACE FUNCTION extract_number_safely(
    data JSONB, 
    paths TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    path TEXT;
    val TEXT;
BEGIN
    FOREACH path IN ARRAY paths LOOP
        BEGIN
            val := data #>> string_to_array(path, '.');
            IF val IS NOT NULL THEN
                RETURN val::INTEGER;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safely extract text from multiple possible paths
CREATE OR REPLACE FUNCTION extract_text_safely(
    data JSONB, 
    paths TEXT[]
) RETURNS TEXT AS $$
DECLARE
    path TEXT;
    val TEXT;
BEGIN
    FOREACH path IN ARRAY paths LOOP
        BEGIN
            val := data #>> string_to_array(path, '.');
            IF val IS NOT NULL AND val != '' THEN
                RETURN val;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safely extract timestamp
CREATE OR REPLACE FUNCTION extract_timestamp_safely(
    data JSONB, 
    paths TEXT[]
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    path TEXT;
    val TEXT;
BEGIN
    FOREACH path IN ARRAY paths LOOP
        BEGIN
            val := data #>> string_to_array(path, '.');
            IF val IS NOT NULL THEN
                RETURN val::TIMESTAMPTZ;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe question extraction
CREATE OR REPLACE FUNCTION safe_extract_questions(
    raw_id UUID,
    data JSONB
) RETURNS VOID AS $$
DECLARE
    questions JSONB;
    search_paths TEXT[] := ARRAY[
        'questions',
        'analysis.questions',
        'data.questions',
        'transcript.questions',
        'call.questions',
        'messages',
        'conversation.questions',
        'structuredData.questions'
    ];
    path TEXT;
BEGIN
    -- Try each path
    FOREACH path IN ARRAY search_paths LOOP
        BEGIN
            questions := data #> string_to_array(path, '.');
            IF questions IS NOT NULL AND questions != 'null'::JSONB THEN
                UPDATE call_data_raw 
                SET extracted_questions = questions
                WHERE id = raw_id;
                RETURN;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
    
    -- If no structured questions, try to extract from messages/transcript
    BEGIN
        questions := extract_questions_from_transcript(data);
        IF questions IS NOT NULL THEN
            UPDATE call_data_raw 
            SET extracted_questions = questions
            WHERE id = raw_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors
        NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Extract questions from unstructured transcript
CREATE OR REPLACE FUNCTION extract_questions_from_transcript(data JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
    message JSONB;
    content TEXT;
BEGIN
    -- Try to find Q&A patterns in messages
    IF data ? 'messages' THEN
        FOR message IN SELECT * FROM jsonb_array_elements(data->'messages')
        LOOP
            content := message->>'content';
            -- Look for email pattern
            IF content ~* 'email.*:.*@' THEN
                result := result || jsonb_build_object('email', 
                    substring(content from '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'));
            END IF;
            -- Look for phone pattern
            IF content ~* 'phone|number.*:.*[0-9]' THEN
                result := result || jsonb_build_object('phone', 
                    substring(content from '([0-9]{3}[-.]?[0-9]{3}[-.]?[0-9]{4})'));
            END IF;
        END LOOP;
    END IF;
    
    RETURN CASE WHEN result = '{}'::JSONB THEN NULL ELSE result END;
END;
$$ LANGUAGE plpgsql;

-- Safe evaluation extraction
CREATE OR REPLACE FUNCTION safe_extract_evaluations(
    raw_id UUID,
    data JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE call_data_raw 
    SET extracted_evaluations = COALESCE(
        data->'evaluations',
        data->'evaluation',
        data->'scores',
        data->'analysis'->'scores',
        data->'metrics',
        data->'analysis'->'metrics',
        '{}'::JSONB
    )
    WHERE id = raw_id;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe entity extraction with deep search
CREATE OR REPLACE FUNCTION safe_extract_entities(
    raw_id UUID,
    data JSONB
) RETURNS VOID AS $$
DECLARE
    entities JSONB;
BEGIN
    -- Search entire JSON for contact information
    entities := jsonb_build_object(
        'caller_name', find_in_json(data, ARRAY['name', 'callerName', 'customerName', 'full_name']),
        'email', find_email_in_json(data),
        'phone', find_phone_in_json(data),
        'budget', find_number_in_json(data, ARRAY['budget', 'price', 'amount']),
        'location', find_in_json(data, ARRAY['location', 'city', 'area', 'address']),
        'property_type', find_in_json(data, ARRAY['propertyType', 'property_type', 'type'])
    );
    
    UPDATE call_data_raw 
    SET extracted_entities = entities
    WHERE id = raw_id;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Deep JSON search for any field
CREATE OR REPLACE FUNCTION find_in_json(
    data JSONB,
    field_names TEXT[]
) RETURNS TEXT AS $$
DECLARE
    result TEXT;
    field TEXT;
BEGIN
    -- Search at all levels of JSON
    FOREACH field IN ARRAY field_names LOOP
        -- Use jsonb_path_query to search deeply
        BEGIN
            SELECT jsonb_path_query_first(data, ('$..**.' || field)::jsonpath) #>> '{}' INTO result;
            IF result IS NOT NULL THEN
                RETURN result;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            CONTINUE;
        END;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Find email anywhere in JSON
CREATE OR REPLACE FUNCTION find_email_in_json(data JSONB)
RETURNS TEXT AS $$
DECLARE
    email_pattern TEXT := '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';
    json_text TEXT;
BEGIN
    json_text := data::TEXT;
    RETURN substring(json_text from email_pattern);
END;
$$ LANGUAGE plpgsql;

-- Find phone anywhere in JSON
CREATE OR REPLACE FUNCTION find_phone_in_json(data JSONB)
RETURNS TEXT AS $$
DECLARE
    phone_pattern TEXT := '\+?1?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})';
    json_text TEXT;
BEGIN
    json_text := data::TEXT;
    RETURN substring(json_text from phone_pattern);
END;
$$ LANGUAGE plpgsql;

-- Find number value in JSON
CREATE OR REPLACE FUNCTION find_number_in_json(
    data JSONB,
    field_names TEXT[]
) RETURNS NUMERIC AS $$
DECLARE
    val TEXT;
BEGIN
    val := find_in_json(data, field_names);
    IF val IS NOT NULL THEN
        -- Extract just numbers
        val := regexp_replace(val, '[^0-9.]', '', 'g');
        RETURN val::NUMERIC;
    END IF;
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe lead detection
CREATE OR REPLACE FUNCTION safe_detect_lead(raw_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE call_data_raw SET
        has_lead = (
            extracted_entities->>'email' IS NOT NULL OR
            extracted_entities->>'phone' IS NOT NULL OR
            extracted_questions->>'email' IS NOT NULL OR
            extracted_questions->>'phone' IS NOT NULL OR
            -- Check raw data too
            find_email_in_json(raw_data) IS NOT NULL OR
            find_phone_in_json(raw_data) IS NOT NULL
        )
    WHERE id = raw_id;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_call_json(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION extract_number_safely(JSONB, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION extract_text_safely(JSONB, TEXT[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION extract_timestamp_safely(JSONB, TEXT[]) TO anon, authenticated;