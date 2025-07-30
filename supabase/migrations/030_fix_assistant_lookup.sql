-- Fix Assistant ID Lookup for Make.com Integration
-- This creates a system that automatically converts VAPI assistant IDs to internal IDs

-- =============================================
-- STEP 1: Create a helper function to convert VAPI ID to internal ID
-- =============================================

CREATE OR REPLACE FUNCTION get_internal_assistant_id(vapi_id TEXT)
RETURNS UUID AS $$
DECLARE
    internal_id UUID;
BEGIN
    SELECT id INTO internal_id
    FROM user_assistants
    WHERE vapi_assistant_id = vapi_id;
    
    IF internal_id IS NULL THEN
        RAISE EXCEPTION 'Assistant not found for VAPI ID: %', vapi_id;
    END IF;
    
    RETURN internal_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 2: Create a trigger to auto-convert VAPI IDs
-- =============================================

CREATE OR REPLACE FUNCTION auto_convert_assistant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If assistant_id looks like a VAPI ID (check if it exists in user_assistants as vapi_assistant_id)
    -- then convert it to the internal ID
    IF NOT EXISTS (SELECT 1 FROM user_assistants WHERE id = NEW.assistant_id) THEN
        -- Try to find it as a vapi_assistant_id instead
        SELECT id INTO NEW.assistant_id
        FROM user_assistants
        WHERE vapi_assistant_id = NEW.assistant_id::TEXT;
        
        IF NEW.assistant_id IS NULL THEN
            RAISE EXCEPTION 'Assistant not found for ID: %', OLD.assistant_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
CREATE TRIGGER trigger_auto_convert_assistant_id
    BEFORE INSERT OR UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_convert_assistant_id();

-- =============================================
-- STEP 3: Create a simplified function for Make.com (optional alternative)
-- =============================================

CREATE OR REPLACE FUNCTION insert_call_from_vapi(
    vapi_call_id TEXT,
    vapi_assistant_id TEXT,
    call_status TEXT DEFAULT 'completed',
    duration_minutes INTEGER DEFAULT 0,
    cost_dollars DECIMAL DEFAULT 0,
    caller_number TEXT DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    transcript TEXT DEFAULT NULL,
    structured_data JSONB DEFAULT '{}',
    success_evaluation JSONB DEFAULT '{}',
    summary TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    internal_assistant_id UUID;
    call_id UUID;
BEGIN
    -- Convert VAPI assistant ID to internal ID
    SELECT id INTO internal_assistant_id
    FROM user_assistants
    WHERE vapi_assistant_id = insert_call_from_vapi.vapi_assistant_id;
    
    IF internal_assistant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Assistant not found',
            'vapi_assistant_id', vapi_assistant_id
        );
    END IF;
    
    -- Insert the call record
    INSERT INTO call_logs (
        vapi_call_id,
        assistant_id,
        call_status,
        duration_seconds,
        cost_cents,
        caller_number,
        started_at,
        transcript,
        structured_data,
        success_evaluation,
        summary
    ) VALUES (
        insert_call_from_vapi.vapi_call_id,
        internal_assistant_id,
        insert_call_from_vapi.call_status,
        insert_call_from_vapi.duration_minutes * 60,
        ROUND(insert_call_from_vapi.cost_dollars * 100),
        insert_call_from_vapi.caller_number,
        insert_call_from_vapi.started_at,
        insert_call_from_vapi.transcript,
        insert_call_from_vapi.structured_data,
        insert_call_from_vapi.success_evaluation,
        insert_call_from_vapi.summary
    ) RETURNING id INTO call_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'call_id', call_id,
        'internal_assistant_id', internal_assistant_id,
        'message', 'Call inserted successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to insert call'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_internal_assistant_id(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_call_from_vapi(TEXT, TEXT, TEXT, INTEGER, DECIMAL, TEXT, TIMESTAMPTZ, TEXT, JSONB, JSONB, TEXT) TO anon, authenticated;