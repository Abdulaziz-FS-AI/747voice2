-- Make.com Integration for Existing Schema
-- Works with your current call_logs and call_analytics tables

-- =============================================
-- ENHANCED PROCESSING FUNCTION
-- =============================================

-- Function to process Make.com data and insert into call_logs
CREATE OR REPLACE FUNCTION insert_call_from_make(
    p_vapi_call_id TEXT,
    p_assistant_id TEXT,
    p_phone_number TEXT DEFAULT NULL,
    p_call_status TEXT DEFAULT 'completed',
    p_duration_minutes INTEGER DEFAULT 0,
    p_cost_dollars DECIMAL DEFAULT 0,
    p_caller_number TEXT DEFAULT NULL,
    p_started_at TIMESTAMPTZ DEFAULT NULL,
    p_ended_at TIMESTAMPTZ DEFAULT NULL,
    p_transcript TEXT DEFAULT NULL,
    p_structured_data JSONB DEFAULT '{}',
    p_success_evaluation JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_assistant_uuid UUID;
    v_phone_number_uuid UUID;
    v_call_log_id UUID;
    v_lead_created BOOLEAN := FALSE;
    v_contact_info JSONB;
BEGIN
    -- Get user and assistant UUIDs
    SELECT user_id, id INTO v_user_id, v_assistant_uuid
    FROM user_assistants
    WHERE vapi_assistant_id = p_assistant_id
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Assistant not found',
            'assistant_id', p_assistant_id
        );
    END IF;
    
    -- Try to find phone number
    IF p_phone_number IS NOT NULL THEN
        SELECT id INTO v_phone_number_uuid
        FROM user_phone_numbers
        WHERE user_id = v_user_id 
          AND (phone_number = p_phone_number OR vapi_phone_id = p_phone_number)
        LIMIT 1;
    END IF;
    
    -- Insert into call_logs
    INSERT INTO call_logs (
        user_id,
        assistant_id,
        phone_number_id,
        vapi_call_id,
        call_status,
        duration_seconds,
        cost_cents,
        caller_number,
        started_at,
        ended_at,
        transcript,
        structured_data,
        success_evaluation
    ) VALUES (
        v_user_id,
        v_assistant_uuid,
        v_phone_number_uuid,
        p_vapi_call_id,
        p_call_status,
        p_duration_minutes * 60, -- Convert minutes to seconds
        ROUND(p_cost_dollars * 100), -- Convert dollars to cents
        p_caller_number,
        COALESCE(p_started_at, NOW()),
        COALESCE(p_ended_at, NOW()),
        p_transcript,
        p_structured_data,
        p_success_evaluation
    ) 
    ON CONFLICT (vapi_call_id) DO UPDATE SET
        call_status = EXCLUDED.call_status,
        duration_seconds = EXCLUDED.duration_seconds,
        cost_cents = EXCLUDED.cost_cents,
        ended_at = EXCLUDED.ended_at,
        transcript = EXCLUDED.transcript,
        structured_data = EXCLUDED.structured_data,
        success_evaluation = EXCLUDED.success_evaluation
    RETURNING id INTO v_call_log_id;
    
    -- Extract and create lead if contact info exists
    IF p_structured_data IS NOT NULL AND p_structured_data != '{}' THEN
        v_contact_info := p_structured_data;
        
        -- Check if we have contact information
        IF v_contact_info->>'email' IS NOT NULL OR 
           v_contact_info->>'phone' IS NOT NULL OR
           p_transcript ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
            
            -- Create leads table if it doesn't exist
            CREATE TABLE IF NOT EXISTS leads (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
                call_log_id UUID REFERENCES call_logs(id) ON DELETE SET NULL,
                first_name TEXT,
                last_name TEXT,
                email TEXT,
                phone TEXT,
                company TEXT,
                lead_source TEXT DEFAULT 'voice_call',
                status TEXT DEFAULT 'new',
                priority TEXT DEFAULT 'medium',
                score INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Enable RLS for leads if not already enabled
            ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
            
            -- Create RLS policy for leads if not exists
            DROP POLICY IF EXISTS "Users can view own leads" ON leads;
            CREATE POLICY "Users can view own leads" ON leads
                FOR ALL USING (auth.uid() = user_id);
            
            -- Insert lead
            INSERT INTO leads (
                user_id,
                call_log_id,
                first_name,
                last_name,
                email,
                phone,
                company,
                status,
                priority,
                score,
                notes
            ) VALUES (
                v_user_id,
                v_call_log_id,
                COALESCE(
                    v_contact_info->>'firstName',
                    split_part(v_contact_info->>'name', ' ', 1),
                    'Unknown'
                ),
                COALESCE(
                    v_contact_info->>'lastName',
                    split_part(v_contact_info->>'name', ' ', 2)
                ),
                COALESCE(
                    v_contact_info->>'email',
                    -- Extract email from transcript if not in structured data
                    substring(p_transcript from '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
                ),
                COALESCE(
                    v_contact_info->>'phone',
                    p_caller_number,
                    -- Extract phone from transcript
                    substring(p_transcript from '\+?1?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})')
                ),
                v_contact_info->>'company',
                'new',
                CASE 
                    WHEN p_duration_minutes >= 5 AND p_success_evaluation IS NOT NULL THEN 'hot'
                    WHEN p_duration_minutes >= 2 THEN 'warm'
                    ELSE 'cool'
                END,
                -- Calculate simple lead score
                LEAST(100, 
                    CASE WHEN v_contact_info->>'email' IS NOT NULL THEN 30 ELSE 0 END +
                    CASE WHEN v_contact_info->>'phone' IS NOT NULL THEN 20 ELSE 0 END +
                    CASE WHEN p_duration_minutes >= 3 THEN 25 ELSE p_duration_minutes * 5 END +
                    CASE WHEN p_success_evaluation IS NOT NULL THEN 25 ELSE 0 END
                ),
                jsonb_build_object(
                    'call_summary', 'Auto-generated from call ' || p_vapi_call_id,
                    'call_duration_minutes', p_duration_minutes,
                    'original_structured_data', p_structured_data,
                    'success_evaluation', p_success_evaluation
                )::TEXT
            ) ON CONFLICT DO NOTHING;
            
            v_lead_created := TRUE;
        END IF;
    END IF;
    
    -- Trigger analytics update
    PERFORM update_call_analytics_for_user(v_user_id, v_assistant_uuid, COALESCE(p_started_at, NOW())::DATE);
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'call_log_id', v_call_log_id,
        'vapi_call_id', p_vapi_call_id,
        'lead_created', v_lead_created,
        'user_id', v_user_id,
        'assistant_id', v_assistant_uuid,
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
-- ANALYTICS UPDATE FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_call_analytics_for_user(
    p_user_id UUID,
    p_assistant_id UUID,
    p_date DATE
)
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
        ) as success_rate
    INTO v_stats
    FROM call_logs
    WHERE user_id = p_user_id
      AND assistant_id = p_assistant_id
      AND DATE(started_at) = p_date;
    
    -- Upsert into call_analytics
    INSERT INTO call_analytics (
        user_id,
        assistant_id,
        date,
        total_calls,
        successful_calls,
        failed_calls,
        total_duration_minutes,
        total_cost_cents,
        average_call_duration,
        success_rate
    ) VALUES (
        p_user_id,
        p_assistant_id,
        p_date,
        v_stats.total_calls,
        v_stats.successful_calls,
        v_stats.failed_calls,
        v_stats.total_duration_minutes,
        v_stats.total_cost_cents,
        v_stats.average_call_duration,
        v_stats.success_rate
    )
    ON CONFLICT (user_id, assistant_id, date) DO UPDATE SET
        total_calls = v_stats.total_calls,
        successful_calls = v_stats.successful_calls,
        failed_calls = v_stats.failed_calls,
        total_duration_minutes = v_stats.total_duration_minutes,
        total_cost_cents = v_stats.total_cost_cents,
        average_call_duration = v_stats.average_call_duration,
        success_rate = v_stats.success_rate,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DASHBOARD VIEWS
-- =============================================

-- Enhanced analytics view with lead information
CREATE OR REPLACE VIEW enhanced_call_analytics AS
SELECT 
    ca.*,
    -- Lead metrics
    COUNT(l.id) as leads_generated,
    COUNT(l.id) FILTER (WHERE l.priority = 'hot') as hot_leads,
    COUNT(l.id) FILTER (WHERE l.priority = 'warm') as warm_leads,
    COUNT(l.id) FILTER (WHERE l.priority = 'cool') as cool_leads,
    ROUND(AVG(l.score), 1) as avg_lead_score,
    
    -- Assistant info
    ua.name as assistant_name,
    
    -- Conversion rates
    ROUND(
        (COUNT(l.id)::DECIMAL / ca.total_calls * 100), 2
    ) as lead_conversion_rate
    
FROM call_analytics ca
LEFT JOIN user_assistants ua ON ca.assistant_id = ua.id
LEFT JOIN call_logs cl ON ca.user_id = cl.user_id 
    AND ca.assistant_id = cl.assistant_id 
    AND DATE(cl.started_at) = ca.date
LEFT JOIN leads l ON cl.id = l.call_log_id
GROUP BY ca.id, ca.user_id, ca.assistant_id, ca.date, ca.total_calls, 
         ca.successful_calls, ca.failed_calls, ca.total_duration_minutes,
         ca.total_cost_cents, ca.average_call_duration, ca.success_rate,
         ca.created_at, ca.updated_at, ua.name;

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_call_from_make(TEXT, TEXT, TEXT, TEXT, INTEGER, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_call_analytics_for_user(UUID, UUID, DATE) TO anon, authenticated;