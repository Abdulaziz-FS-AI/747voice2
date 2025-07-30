-- AI-Enhanced Call Processing with Advanced Intelligence
-- Adds sentiment analysis, intent detection, and smart categorization

-- =============================================
-- ENHANCED INTELLIGENCE FUNCTIONS
-- =============================================

-- Sentiment Analysis from transcript/summary
CREATE OR REPLACE FUNCTION analyze_sentiment(data JSONB)
RETURNS DECIMAL AS $$
DECLARE
    text_content TEXT;
    positive_score INTEGER := 0;
    negative_score INTEGER := 0;
    
    -- Positive indicators
    positive_words TEXT[] := ARRAY[
        'interested', 'excited', 'ready', 'perfect', 'great', 'love', 'absolutely',
        'definitely', 'sure', 'yes', 'wonderful', 'amazing', 'fantastic', 'immediately',
        'asap', 'urgent', 'need', 'want', 'looking for', 'budget ready'
    ];
    
    -- Negative indicators  
    negative_words TEXT[] := ARRAY[
        'not interested', 'no', 'maybe later', 'thinking', 'unsure', 'expensive',
        'budget', 'cannot', 'won''t', 'don''t', 'never', 'confused', 'uncertain',
        'possibly', 'perhaps', 'someday', 'future', 'wait'
    ];
    
    word TEXT;
BEGIN
    -- Combine all text fields
    text_content := LOWER(COALESCE(
        data->>'transcript', '') || ' ' || COALESCE(
        data->>'summary', '') || ' ' || COALESCE(
        data->'analysis'->>'summary', ''
    ));
    
    -- Count positive indicators
    FOREACH word IN ARRAY positive_words LOOP
        IF text_content LIKE '%' || word || '%' THEN
            positive_score := positive_score + 1;
        END IF;
    END LOOP;
    
    -- Count negative indicators
    FOREACH word IN ARRAY negative_words LOOP
        IF text_content LIKE '%' || word || '%' THEN
            negative_score := negative_score + 1;
        END IF;
    END LOOP;
    
    -- Calculate sentiment score (-1 to 1)
    IF positive_score + negative_score = 0 THEN
        RETURN 0;
    ELSE
        RETURN ROUND(
            ((positive_score - negative_score)::DECIMAL / 
            (positive_score + negative_score)::DECIMAL)::NUMERIC, 2
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Intent Detection
CREATE OR REPLACE FUNCTION detect_call_intents(data JSONB)
RETURNS TEXT[] AS $$
DECLARE
    intents TEXT[] := '{}';
    text_content TEXT;
    
    -- Intent patterns
    intent_patterns JSONB := '{
        "schedule_viewing": ["view", "showing", "tour", "visit", "see the property"],
        "get_information": ["information", "details", "tell me", "know more", "questions"],
        "price_negotiation": ["price", "cost", "expensive", "discount", "negotiate", "budget"],
        "immediate_interest": ["immediately", "asap", "today", "now", "urgent", "right away"],
        "comparison_shopping": ["other properties", "options", "alternatives", "comparing"],
        "financing_inquiry": ["financing", "mortgage", "loan", "payment", "afford"],
        "investment_interest": ["investment", "roi", "rental", "return", "cash flow"],
        "general_inquiry": ["just looking", "curious", "browsing", "research"]
    }'::JSONB;
    
    pattern_key TEXT;
    pattern_array JSONB;
    pattern TEXT;
BEGIN
    -- Get text content
    text_content := LOWER(COALESCE(
        data->>'transcript', '') || ' ' || COALESCE(
        data->>'summary', '') || ' ' || COALESCE(
        data->'analysis'->>'summary', ''
    ));
    
    -- Check each intent pattern
    FOR pattern_key, pattern_array IN SELECT * FROM jsonb_each(intent_patterns) LOOP
        FOR pattern IN SELECT jsonb_array_elements_text(pattern_array) LOOP
            IF text_content LIKE '%' || pattern || '%' THEN
                intents := array_append(intents, pattern_key);
                EXIT; -- Only add each intent once
            END IF;
        END LOOP;
    END LOOP;
    
    -- If no specific intent found, mark as general
    IF array_length(intents, 1) IS NULL THEN
        intents := ARRAY['general_inquiry'];
    END IF;
    
    RETURN intents;
END;
$$ LANGUAGE plpgsql;

-- Lead Scoring Algorithm
CREATE OR REPLACE FUNCTION calculate_lead_score(raw_id UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    call_data RECORD;
    entity_data JSONB;
    question_data JSONB;
BEGIN
    -- Get call data
    SELECT * INTO call_data FROM call_data_raw WHERE id = raw_id;
    entity_data := call_data.extracted_entities;
    question_data := call_data.extracted_questions;
    
    -- Contact Information Score (0-30 points)
    IF entity_data->>'email' IS NOT NULL OR question_data->>'email' IS NOT NULL THEN
        score := score + 15;
    END IF;
    IF entity_data->>'phone' IS NOT NULL OR question_data->>'phone' IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Engagement Score (0-25 points)
    IF call_data.call_duration > 300 THEN -- 5+ minutes
        score := score + 15;
    ELSIF call_data.call_duration > 120 THEN -- 2+ minutes
        score := score + 10;
    ELSIF call_data.call_duration > 60 THEN -- 1+ minute
        score := score + 5;
    END IF;
    
    -- Add points for answered questions
    score := score + LEAST(10, (SELECT COUNT(*) FROM jsonb_each(question_data) WHERE value IS NOT NULL));
    
    -- Intent Score (0-25 points)
    IF 'immediate_interest' = ANY(call_data.intent_detected) THEN
        score := score + 25;
    ELSIF 'schedule_viewing' = ANY(call_data.intent_detected) THEN
        score := score + 20;
    ELSIF 'price_negotiation' = ANY(call_data.intent_detected) THEN
        score := score + 15;
    ELSIF 'get_information' = ANY(call_data.intent_detected) THEN
        score := score + 10;
    END IF;
    
    -- Sentiment Score (0-20 points)
    IF call_data.sentiment_score > 0.5 THEN
        score := score + 20;
    ELSIF call_data.sentiment_score > 0 THEN
        score := score + 10;
    END IF;
    
    RETURN LEAST(100, score); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Intelligent Field Extraction with NLP patterns
CREATE OR REPLACE FUNCTION extract_budget_from_text(text_content TEXT)
RETURNS JSONB AS $$
DECLARE
    budget_match TEXT;
    min_budget NUMERIC;
    max_budget NUMERIC;
BEGIN
    -- Look for budget patterns
    -- "budget is 500k to 700k" or "around 500,000" or "up to 1 million"
    
    -- Pattern: "X to Y"
    budget_match := substring(text_content from 
        '(\d+\.?\d*)\s*(?:k|K|thousand|million|m|M)?\s*(?:to|-)\s*(\d+\.?\d*)\s*(?:k|K|thousand|million|m|M)?');
    
    IF budget_match IS NOT NULL THEN
        -- Extract and normalize numbers
        -- Implementation simplified for example
        RETURN jsonb_build_object(
            'min', min_budget,
            'max', max_budget,
            'confidence', 0.9
        );
    END IF;
    
    -- Pattern: "around X" or "about X"
    budget_match := substring(text_content from 
        '(?:around|about|approximately|roughly)\s*\$?\s*(\d+\.?\d*)\s*(?:k|K|thousand|million|m|M)?');
    
    IF budget_match IS NOT NULL THEN
        -- Set min/max as +/- 10%
        RETURN jsonb_build_object(
            'min', min_budget * 0.9,
            'max', max_budget * 1.1,
            'confidence', 0.7
        );
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Main Enhanced Processing Function
CREATE OR REPLACE FUNCTION process_call_with_ai(input_json JSONB)
RETURNS JSONB AS $$
DECLARE
    raw_id UUID;
    lead_score INTEGER;
BEGIN
    -- First, run standard processing
    PERFORM process_call_json(input_json);
    
    -- Get the created record
    SELECT id INTO raw_id 
    FROM call_data_raw 
    WHERE call_id = COALESCE(
        input_json->>'callId',
        input_json->>'id',
        input_json->'call'->>'id'
    )
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Add AI enhancements
    UPDATE call_data_raw SET
        sentiment_score = analyze_sentiment(raw_data),
        intent_detected = detect_call_intents(raw_data)
    WHERE id = raw_id;
    
    -- Calculate lead score
    lead_score := calculate_lead_score(raw_id);
    
    -- Update lead with score and priority
    IF EXISTS (SELECT 1 FROM call_data_raw WHERE id = raw_id AND has_lead = TRUE) THEN
        UPDATE leads SET
            score = lead_score,
            priority = CASE
                WHEN lead_score >= 80 THEN 'hot'
                WHEN lead_score >= 60 THEN 'warm'
                WHEN lead_score >= 40 THEN 'cool'
                ELSE 'cold'
            END,
            tags = ARRAY(
                SELECT DISTINCT unnest(
                    ARRAY['auto-detected'] || 
                    (SELECT intent_detected FROM call_data_raw WHERE id = raw_id)
                )
            )
        WHERE email = (
            SELECT extracted_entities->>'email' 
            FROM call_data_raw 
            WHERE id = raw_id
        )
        OR phone = (
            SELECT extracted_entities->>'phone' 
            FROM call_data_raw 
            WHERE id = raw_id
        );
    END IF;
    
    -- Return enriched response
    RETURN jsonb_build_object(
        'success', true,
        'call_data_id', raw_id,
        'intelligence_report', jsonb_build_object(
            'lead_score', lead_score,
            'sentiment', (SELECT sentiment_score FROM call_data_raw WHERE id = raw_id),
            'intents', (SELECT intent_detected FROM call_data_raw WHERE id = raw_id),
            'has_contact_info', (SELECT has_lead FROM call_data_raw WHERE id = raw_id),
            'priority', CASE
                WHEN lead_score >= 80 THEN 'hot'
                WHEN lead_score >= 60 THEN 'warm'
                WHEN lead_score >= 40 THEN 'cool'
                ELSE 'cold'
            END,
            'recommended_action', CASE
                WHEN lead_score >= 80 THEN 'Contact immediately - high interest'
                WHEN lead_score >= 60 THEN 'Follow up within 24 hours'
                WHEN lead_score >= 40 THEN 'Add to nurture campaign'
                ELSE 'Monitor for future interest'
            END
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add score and priority columns to leads if not exists
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Grant permissions
GRANT EXECUTE ON FUNCTION analyze_sentiment(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION detect_call_intents(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_lead_score(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION process_call_with_ai(JSONB) TO anon, authenticated;