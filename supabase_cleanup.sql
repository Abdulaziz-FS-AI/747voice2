-- ============================================================================
-- VOICE MATRIX DATABASE CLEANUP & RESTRUCTURE
-- Remove unnecessary tables and simplify structure
-- ============================================================================

-- 1. DROP UNNECESSARY TABLES
-- Remove call_analytics (redundant with call_logs)
DROP TABLE IF EXISTS public.call_analytics CASCADE;

-- Remove client_sessions (no need for session management)
DROP TABLE IF EXISTS public.client_sessions CASCADE;

-- 2. RECREATE SIMPLIFIED call_logs TABLE
-- Drop existing call_logs and recreate with simplified structure
DROP TABLE IF EXISTS public.call_logs CASCADE;

CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  vapi_call_id text UNIQUE,
  evaluation boolean, -- Call success/quality evaluation
  caller_number text,
  transcript text,
  summary text,
  structured_data jsonb, -- May be empty/null - not all assistants have this
  started_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  duration_seconds integer DEFAULT 0,
  
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.client_assistants(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_vapi_call_id ON public.call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at DESC);
CREATE INDEX idx_call_logs_evaluation ON public.call_logs(evaluation);

-- 3. UPDATE EXISTING FUNCTIONS TO REMOVE SESSION LOGIC

-- Drop all session-related functions
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions();
DROP FUNCTION IF EXISTS public.authenticate_pin(text, text, text);
DROP FUNCTION IF EXISTS public.validate_session(text);
DROP FUNCTION IF EXISTS public.logout_session(text);

-- Create simple PIN validation function (no sessions)
CREATE OR REPLACE FUNCTION public.validate_pin_simple(pin_input text)
RETURNS TABLE(
  valid boolean,
  client_id uuid,
  company_name text,
  error_message text
) AS $$
DECLARE
  found_client_id uuid;
  found_company_name text;
BEGIN
  -- Validate PIN format (exactly 6 digits preferred)
  IF pin_input !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'PIN must be exactly 6 digits'::text;
    RETURN;
  END IF;
  
  -- Find client by PIN
  SELECT c.id, c.company_name
  INTO found_client_id, found_company_name
  FROM public.clients c
  WHERE c.pin = pin_input AND c.is_active = true;
  
  IF found_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'Invalid PIN or inactive client'::text;
    RETURN;
  END IF;
  
  -- Return success
  RETURN QUERY SELECT true, found_client_id, found_company_name, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ADD last_synced_at COLUMN IF NOT EXISTS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_assistants' 
    AND column_name = 'last_synced_at'
  ) THEN
    ALTER TABLE public.client_assistants 
    ADD COLUMN last_synced_at timestamp with time zone DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- UPDATE get_client_assistants TO MATCH NEW SCHEMA
DROP FUNCTION IF EXISTS public.get_client_assistants(uuid);

CREATE FUNCTION public.get_client_assistants(client_id_input uuid)
RETURNS TABLE(
  id uuid,
  vapi_assistant_id text,
  display_name text,
  first_message text,
  voice text,
  model text,
  eval_method text,
  max_call_duration integer,
  system_prompt text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_synced_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.vapi_assistant_id,
    ca.display_name,
    ca.first_message,
    ca.voice,
    ca.model,
    ca.eval_method,
    ca.max_call_duration,
    ca.system_prompt,
    ca.created_at,
    ca.updated_at,
    ca.last_synced_at
  FROM public.client_assistants ca
  WHERE ca.client_id = client_id_input
  ORDER BY ca.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE SIMPLIFIED ANALYTICS FUNCTION (REAL-TIME FROM call_logs)
DROP FUNCTION IF EXISTS public.get_dashboard_analytics(uuid, integer);
DROP FUNCTION IF EXISTS public.get_dashboard_analytics_enhanced(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_analytics_simple(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  success_rate numeric,
  avg_duration_minutes numeric,
  total_duration_hours numeric,
  recent_calls json
) AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  start_date := timezone('utc'::text, now()) - (days_back || ' days')::interval;
  
  RETURN QUERY
  WITH assistant_calls AS (
    SELECT cl.*
    FROM public.call_logs cl
    JOIN public.client_assistants ca ON ca.id = cl.assistant_id
    WHERE ca.client_id = client_id_input 
      AND cl.started_at >= start_date
  ),
  stats AS (
    SELECT 
      COUNT(*)::bigint as total_calls,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN evaluation = true THEN 1 END)::numeric / COUNT(*)::numeric * 100)
        ELSE 0
      END as success_rate,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (AVG(duration_seconds) / 60)::numeric
        ELSE 0
      END as avg_duration_minutes,
      COALESCE(SUM(duration_seconds) / 3600, 0)::numeric as total_duration_hours
    FROM assistant_calls
  ),
  recent AS (
    SELECT json_agg(
      json_build_object(
        'id', ac.id,
        'vapi_call_id', ac.vapi_call_id,
        'caller_number', ac.caller_number,
        'started_at', ac.started_at,
        'duration_seconds', ac.duration_seconds,
        'evaluation', ac.evaluation,
        'summary', ac.summary
      ) ORDER BY ac.started_at DESC
    ) as recent_calls
    FROM (
      SELECT * FROM assistant_calls
      ORDER BY started_at DESC
      LIMIT 10
    ) ac
  )
  SELECT 
    s.total_calls,
    ROUND(s.success_rate, 2) as success_rate,
    ROUND(s.avg_duration_minutes, 2) as avg_duration_minutes,
    ROUND(s.total_duration_hours, 2) as total_duration_hours,
    COALESCE(r.recent_calls, '[]'::json) as recent_calls
  FROM stats s, recent r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. UPDATE change_pin FUNCTION (NO EMAIL VERIFICATION - SIMPLIFIED)
DROP FUNCTION IF EXISTS public.change_pin(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.change_pin_simple(
  client_id_input uuid,
  current_pin_input text,
  new_pin_input text
)
RETURNS TABLE(
  success boolean,
  message text,
  error_code text
) AS $$
DECLARE
  current_pin_valid boolean;
  pin_exists boolean;
BEGIN
  -- Validate new PIN format (exactly 6 digits)
  IF new_pin_input !~ '^[0-9]{6}$' THEN
    RETURN QUERY SELECT false, 'New PIN must be exactly 6 digits'::text, 'INVALID_PIN_FORMAT'::text;
    RETURN;
  END IF;
  
  -- Verify current PIN
  SELECT EXISTS(
    SELECT 1 FROM public.clients 
    WHERE id = client_id_input 
      AND pin = current_pin_input 
      AND is_active = true
  ) INTO current_pin_valid;
  
  IF NOT current_pin_valid THEN
    RETURN QUERY SELECT false, 'Current PIN is incorrect'::text, 'INVALID_CREDENTIALS'::text;
    RETURN;
  END IF;
  
  -- Check if new PIN is already in use
  SELECT EXISTS(
    SELECT 1 FROM public.clients 
    WHERE pin = new_pin_input AND id != client_id_input
  ) INTO pin_exists;
  
  IF pin_exists THEN
    RETURN QUERY SELECT false, 'PIN already in use'::text, 'PIN_ALREADY_EXISTS'::text;
    RETURN;
  END IF;
  
  -- Update PIN
  UPDATE public.clients 
  SET 
    pin = new_pin_input,
    pin_changed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = client_id_input;
  
  RETURN QUERY SELECT true, 'PIN changed successfully'::text, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE FUNCTION TO LOG CALLS FROM VAPI WEBHOOKS
CREATE OR REPLACE FUNCTION public.log_call_from_vapi(
  vapi_call_id_input text,
  vapi_assistant_id_input text,
  caller_number_input text DEFAULT NULL,
  evaluation_input boolean DEFAULT NULL,
  transcript_input text DEFAULT NULL,
  summary_input text DEFAULT NULL,
  structured_data_input jsonb DEFAULT NULL,
  started_at_input timestamp with time zone DEFAULT NULL,
  duration_seconds_input integer DEFAULT 0
)
RETURNS TABLE(
  success boolean,
  call_log_id uuid,
  message text
) AS $$
DECLARE
  found_assistant_id uuid;
  new_call_log_id uuid;
BEGIN
  -- Find assistant by VAPI assistant ID
  SELECT ca.id INTO found_assistant_id
  FROM public.client_assistants ca
  WHERE ca.vapi_assistant_id = vapi_assistant_id_input;
  
  IF found_assistant_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 
      ('Assistant not found for VAPI ID: ' || vapi_assistant_id_input)::text;
    RETURN;
  END IF;
  
  -- Insert or update call log
  INSERT INTO public.call_logs (
    vapi_call_id,
    assistant_id,
    caller_number,
    evaluation,
    transcript,
    summary,
    structured_data,
    started_at,
    duration_seconds
  ) VALUES (
    vapi_call_id_input,
    found_assistant_id,
    caller_number_input,
    evaluation_input,
    transcript_input,
    summary_input,
    structured_data_input,
    COALESCE(started_at_input, timezone('utc'::text, now())),
    duration_seconds_input
  )
  ON CONFLICT (vapi_call_id) DO UPDATE SET
    evaluation = COALESCE(EXCLUDED.evaluation, call_logs.evaluation),
    transcript = COALESCE(EXCLUDED.transcript, call_logs.transcript),
    summary = COALESCE(EXCLUDED.summary, call_logs.summary),
    structured_data = COALESCE(EXCLUDED.structured_data, call_logs.structured_data),
    duration_seconds = EXCLUDED.duration_seconds
  RETURNING id INTO new_call_log_id;
  
  RETURN QUERY SELECT true, new_call_log_id, 'Call logged successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. UPDATE RLS POLICIES (REMOVE SESSION POLICIES)
-- Drop old policies for removed tables (ignore errors if tables don't exist)
DO $$ 
BEGIN
  -- Drop policies only if tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analytics') THEN
    DROP POLICY IF EXISTS "Service role has full access to call_analytics" ON public.call_analytics;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_sessions') THEN
    DROP POLICY IF EXISTS "Service role has full access to client_sessions" ON public.client_sessions;
    DROP POLICY IF EXISTS "Anonymous can create sessions" ON public.client_sessions;
    DROP POLICY IF EXISTS "Anonymous can validate sessions" ON public.client_sessions;
    DROP POLICY IF EXISTS "Anonymous can update own sessions" ON public.client_sessions;
  END IF;
END $$;

-- Create RLS policy for new call_logs table
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to call_logs" ON public.call_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 9. GRANT PERMISSIONS TO NEW FUNCTIONS
GRANT EXECUTE ON FUNCTION public.validate_pin_simple TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_assistants TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics_simple TO anon;
GRANT EXECUTE ON FUNCTION public.change_pin_simple TO anon;
GRANT EXECUTE ON FUNCTION public.log_call_from_vapi TO anon;

-- Keep existing update_assistant function permissions
GRANT EXECUTE ON FUNCTION public.update_assistant TO anon;

-- 10. VERIFICATION
SELECT 'Database cleanup completed successfully!' as result
UNION ALL
SELECT 'Remaining tables:' as status
UNION ALL
SELECT '✓ ' || tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'clients', 'client_assistants', 'client_phone_numbers', 'call_logs'
)
UNION ALL
SELECT 'New functions created:' as status
UNION ALL
SELECT '✓ ' || routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN (
  'validate_pin_simple', 'get_client_assistants', 'get_dashboard_analytics_simple',
  'change_pin_simple', 'log_call_from_vapi', 'update_assistant'
);

-- Final summary
SELECT '🎉 Simplified Voice Matrix database ready!' as final_result;