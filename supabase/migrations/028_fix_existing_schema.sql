-- Fix existing schema issues for Make.com integration

-- =============================================
-- FIX 1: Add missing indexes for leads table
-- =============================================

-- Create leads table indexes if they don't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leads') THEN
        -- Add indexes for performance
        CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
        CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
        CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
        CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
        
        -- Add unique constraint on email to prevent duplicates
        ALTER TABLE leads ADD CONSTRAINT unique_user_email UNIQUE(user_id, email);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN NULL;
END $$;

-- =============================================
-- FIX 2: Allow anonymous inserts to call_logs
-- =============================================

-- Create policy to allow Make.com (anonymous) to insert call data
DROP POLICY IF EXISTS "Allow service inserts to call_logs" ON call_logs;
CREATE POLICY "Allow service inserts to call_logs" ON call_logs
    FOR INSERT TO anon
    WITH CHECK (true);

-- =============================================
-- FIX 3: Update the insert function to handle edge cases
-- =============================================

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
    v_email TEXT;
    v_phone TEXT;
BEGIN
    -- Get user and assistant UUIDs - try multiple approaches
    SELECT user_id, id INTO v_user_id, v_assistant_uuid
    FROM user_assistants
    WHERE vapi_assistant_id = p_assistant_id
       OR name ILIKE '%' || p_assistant_id || '%'
    LIMIT 1;
    
    -- If still no assistant found, try to get first assistant for any user
    IF v_user_id IS NULL THEN
        SELECT user_id, id INTO v_user_id, v_assistant_uuid
        FROM user_assistants
        ORDER BY created_at
        LIMIT 1;
    END IF;
    
    -- If still no user, get the first user from profiles
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM profiles LIMIT 1;
        
        -- If no users exist, create a system user
        IF v_user_id IS NULL THEN
            INSERT INTO profiles (id, email, full_name)
            VALUES (gen_random_uuid(), 'system@voicematrix.ai', 'System User')
            RETURNING id INTO v_user_id;
        END IF;
    END IF;
    
    -- Try to find phone number
    IF p_phone_number IS NOT NULL THEN
        SELECT id INTO v_phone_number_uuid
        FROM user_phone_numbers
        WHERE user_id = v_user_id 
          AND (phone_number = p_phone_number OR vapi_phone_id = p_phone_number)
        LIMIT 1;
    END IF;
    
    -- Insert into call_logs with better error handling
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
        COALESCE(p_call_status, 'completed'),
        GREATEST(0, COALESCE(p_duration_minutes, 0) * 60), -- Ensure non-negative
        GREATEST(0, ROUND(COALESCE(p_cost_dollars, 0) * 100)), -- Ensure non-negative cents
        p_caller_number,
        COALESCE(p_started_at, NOW()),
        COALESCE(p_ended_at, p_started_at, NOW()),
        p_transcript,
        COALESCE(p_structured_data, '{}'::JSONB),
        COALESCE(p_success_evaluation, '{}'::JSONB)
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
    
    -- Enhanced contact info extraction
    IF p_structured_data IS NOT NULL AND p_structured_data != '{}' THEN
        -- Extract email from multiple possible fields
        v_email := COALESCE(
            p_structured_data->>'email',
            p_structured_data->>'emailAddress',
            p_structured_data->'contact'->>'email',
            p_structured_data->'customer'->>'email'
        );
        
        -- Extract phone from multiple possible fields
        v_phone := COALESCE(
            p_structured_data->>'phone',
            p_structured_data->>'phoneNumber',
            p_structured_data->'contact'->>'phone',
            p_structured_data->'customer'->>'phone',
            p_caller_number
        );
        
        -- Also try regex extraction from transcript
        IF v_email IS NULL AND p_transcript IS NOT NULL THEN
            v_email := substring(p_transcript from '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}');
        END IF;
        
        IF v_phone IS NULL AND p_transcript IS NOT NULL THEN
            v_phone := substring(p_transcript from '\+?1?[-.]?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})');
        END IF;
        
        -- Create lead if we have contact info
        IF v_email IS NOT NULL OR v_phone IS NOT NULL THEN
            -- Ensure leads table exists
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
            
            -- Enable RLS
            ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
            
            -- Create policy
            DROP POLICY IF EXISTS "Users can manage own leads" ON leads;
            CREATE POLICY "Users can manage own leads" ON leads
                FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);
            
            -- Insert lead with conflict handling
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
                    p_structured_data->>'firstName',
                    p_structured_data->>'first_name',
                    split_part(COALESCE(p_structured_data->>'name', p_structured_data->>'fullName', ''), ' ', 1),
                    'Unknown'
                ),
                COALESCE(
                    p_structured_data->>'lastName',
                    p_structured_data->>'last_name',
                    split_part(COALESCE(p_structured_data->>'name', p_structured_data->>'fullName', ''), ' ', 2)
                ),
                v_email,
                v_phone,
                COALESCE(p_structured_data->>'company', p_structured_data->>'organization'),
                'new',
                CASE 
                    WHEN p_duration_minutes >= 5 AND p_success_evaluation IS NOT NULL THEN 'hot'
                    WHEN p_duration_minutes >= 2 THEN 'warm'
                    ELSE 'cool'
                END,
                -- Calculate lead score
                LEAST(100, 
                    CASE WHEN v_email IS NOT NULL THEN 30 ELSE 0 END +
                    CASE WHEN v_phone IS NOT NULL THEN 20 ELSE 0 END +
                    CASE WHEN p_duration_minutes >= 3 THEN 25 ELSE GREATEST(0, p_duration_minutes * 5) END +
                    CASE WHEN p_success_evaluation IS NOT NULL AND p_success_evaluation != '{}' THEN 25 ELSE 0 END
                ),
                jsonb_build_object(
                    'call_summary', 'Generated from call ' || p_vapi_call_id,
                    'call_duration_minutes', p_duration_minutes,
                    'structured_data', p_structured_data,
                    'success_evaluation', p_success_evaluation,
                    'source', 'make_com_integration'
                )::TEXT
            ) 
            ON CONFLICT (user_id, email) DO UPDATE SET
                phone = COALESCE(EXCLUDED.phone, leads.phone),
                company = COALESCE(EXCLUDED.company, leads.company),
                score = GREATEST(leads.score, EXCLUDED.score),
                updated_at = NOW();
            
            v_lead_created := TRUE;
        END IF;
    END IF;
    
    -- Update analytics
    PERFORM update_call_analytics_for_user(
        v_user_id, 
        v_assistant_uuid, 
        COALESCE(p_started_at, NOW())::DATE
    );
    
    -- Return detailed response
    RETURN jsonb_build_object(
        'success', true,
        'call_log_id', v_call_log_id,
        'vapi_call_id', p_vapi_call_id,
        'user_id', v_user_id,
        'assistant_id', v_assistant_uuid,
        'lead_created', v_lead_created,
        'contact_info', jsonb_build_object(
            'email', v_email,
            'phone', v_phone
        ),
        'message', 'Call data processed successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail completely
    RAISE LOG 'Error in insert_call_from_make: %', SQLERRM;
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'message', 'Failed to process call data',
        'input', jsonb_build_object(
            'vapi_call_id', p_vapi_call_id,
            'assistant_id', p_assistant_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIX 4: Create a simple health check function
-- =============================================

CREATE OR REPLACE FUNCTION health_check()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'status', 'healthy',
        'timestamp', NOW(),
        'tables', jsonb_build_object(
            'profiles', (SELECT COUNT(*) FROM profiles),
            'user_assistants', (SELECT COUNT(*) FROM user_assistants),
            'call_logs', (SELECT COUNT(*) FROM call_logs),
            'call_analytics', (SELECT COUNT(*) FROM call_analytics)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_call_from_make(TEXT, TEXT, TEXT, TEXT, INTEGER, DECIMAL, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION health_check() TO anon, authenticated;