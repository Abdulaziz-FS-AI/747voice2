-- ============================================================================
-- COMPLETE DATABASE SETUP FOR PIN-BASED VOICE ASSISTANT SYSTEM
-- ============================================================================
-- This file contains all migrations in the correct order
-- Run this file to set up the entire database from scratch
-- ============================================================================

-- Clean up any existing schema (optional - comment out if keeping data)
DROP TABLE IF EXISTS public.call_analytics CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.client_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.client_assistants CASCADE;
DROP TABLE IF EXISTS public.client_sessions CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- ============================================================================
-- MIGRATION 1: INIT PIN SYSTEM
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create clients table (PIN-based authentication)
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pin text NOT NULL UNIQUE CHECK (pin ~ '^[0-9]{6,8}$'), -- 6-8 digit PIN
  company_name text NOT NULL,
  contact_email text NOT NULL, -- Required for PIN change verification
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  notes text,
  pin_changed_at timestamp with time zone,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Create client_assistants table (manually assigned from VAPI)
CREATE TABLE public.client_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  vapi_assistant_id text NOT NULL UNIQUE, -- Manually assigned VAPI ID
  
  -- Client-editable fields
  display_name text NOT NULL,
  first_message text,
  voice text,
  model text,
  eval_method text,
  max_call_duration integer DEFAULT 300, -- seconds
  
  -- Read-only fields (from VAPI)
  system_prompt text,
  questions jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  assigned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  
  CONSTRAINT client_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT client_assistants_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Create client_phone_numbers table (manually assigned from VAPI)
CREATE TABLE public.client_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  vapi_phone_id text NOT NULL UNIQUE, -- Manually assigned VAPI phone ID
  phone_number text NOT NULL,
  friendly_name text NOT NULL,
  assigned_assistant_id uuid,
  
  -- Metadata
  assigned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  notes text,
  
  CONSTRAINT client_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT client_phone_numbers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT client_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.client_assistants(id) ON DELETE SET NULL
);

-- Create call_logs table for analytics
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  assistant_id uuid NOT NULL,
  phone_number_id uuid,
  vapi_call_id text UNIQUE,
  
  -- Call details
  caller_number text,
  call_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  end_time timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  call_status text DEFAULT 'in_progress',
  call_type text DEFAULT 'inbound',
  
  -- Call content
  transcript text,
  recording_url text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  success_evaluation boolean,
  summary text,
  
  -- Cost tracking
  cost numeric(10,4) DEFAULT 0,
  
  -- Assistant info cache
  assistant_display_name text,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.client_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.client_phone_numbers(id) ON DELETE SET NULL
);

-- Create call_analytics table for dashboard stats
CREATE TABLE public.call_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  assistant_id uuid,
  call_log_id uuid,
  
  -- Analytics data
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer DEFAULT 0,
  cost numeric(10,4) DEFAULT 0,
  success_evaluation boolean,
  
  -- Aggregated fields for daily stats
  total_calls integer DEFAULT 0,
  successful_calls integer DEFAULT 0,
  failed_calls integer DEFAULT 0,
  total_duration_seconds integer DEFAULT 0,
  total_cost_cents integer DEFAULT 0,
  average_call_duration numeric(10,2) DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  
  -- Call metadata
  has_recording boolean DEFAULT false,
  has_transcript boolean DEFAULT false,
  transcript_length integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT call_analytics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.client_assistants(id) ON DELETE SET NULL,
  CONSTRAINT call_analytics_call_log_id_fkey FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_unique_daily UNIQUE (client_id, assistant_id, date)
);

-- Create client_sessions table for PIN authentication
CREATE TABLE public.client_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
  last_accessed timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  
  CONSTRAINT client_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT client_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Create performance indexes
CREATE INDEX idx_clients_pin ON public.clients(pin);
CREATE INDEX idx_clients_active ON public.clients(is_active);
CREATE INDEX idx_clients_email ON public.clients(contact_email);

CREATE INDEX idx_client_assistants_client_id ON public.client_assistants(client_id);
CREATE INDEX idx_client_assistants_vapi_id ON public.client_assistants(vapi_assistant_id);
CREATE INDEX idx_client_assistants_active ON public.client_assistants(is_active);

CREATE INDEX idx_client_phone_numbers_client_id ON public.client_phone_numbers(client_id);
CREATE INDEX idx_client_phone_numbers_vapi_phone_id ON public.client_phone_numbers(vapi_phone_id);
CREATE INDEX idx_client_phone_numbers_active ON public.client_phone_numbers(is_active);
CREATE INDEX idx_client_phone_numbers_phone ON public.client_phone_numbers(phone_number);

CREATE INDEX idx_call_logs_client_id ON public.call_logs(client_id);
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_phone_number_id ON public.call_logs(phone_number_id);
CREATE INDEX idx_call_logs_call_time ON public.call_logs(call_time);
CREATE INDEX idx_call_logs_vapi_call_id ON public.call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_status ON public.call_logs(call_status);

CREATE INDEX idx_call_analytics_client_id ON public.call_analytics(client_id);
CREATE INDEX idx_call_analytics_date ON public.call_analytics(date);
CREATE INDEX idx_call_analytics_client_date ON public.call_analytics(client_id, date);
CREATE INDEX idx_call_analytics_call_log_id ON public.call_analytics(call_log_id);

CREATE INDEX idx_client_sessions_token ON public.client_sessions(session_token);
CREATE INDEX idx_client_sessions_expires_at ON public.client_sessions(expires_at);
CREATE INDEX idx_client_sessions_active ON public.client_sessions(is_active);
CREATE INDEX idx_client_sessions_client_id ON public.client_sessions(client_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER client_assistants_updated_at
  BEFORE UPDATE ON public.client_assistants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER client_phone_numbers_updated_at
  BEFORE UPDATE ON public.client_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER call_analytics_updated_at
  BEFORE UPDATE ON public.call_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- MIGRATION 2: AUTH FUNCTIONS
-- ============================================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.client_sessions 
  WHERE expires_at < timezone('utc'::text, now()) OR is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate PIN and create session
CREATE OR REPLACE FUNCTION public.authenticate_pin(
  pin_input text, 
  client_ip text DEFAULT NULL, 
  client_user_agent text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  client_id uuid,
  session_token text,
  company_name text,
  error_message text
) AS $$
DECLARE
  found_client_id uuid;
  found_company_name text;
  new_session_token text;
BEGIN
  -- Clean up expired sessions first
  PERFORM public.cleanup_expired_sessions();
  
  -- Validate PIN format
  IF pin_input !~ '^[0-9]{6,8}$' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, 'Invalid PIN format'::text;
    RETURN;
  END IF;
  
  -- Find client by PIN
  SELECT c.id, c.company_name
  INTO found_client_id, found_company_name
  FROM public.clients c
  WHERE c.pin = pin_input AND c.is_active = true;
  
  IF found_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, 'Invalid PIN or inactive client'::text;
    RETURN;
  END IF;
  
  -- Generate secure session token
  new_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create new session
  INSERT INTO public.client_sessions (client_id, session_token, ip_address, user_agent)
  VALUES (found_client_id, new_session_token, client_ip, client_user_agent);
  
  -- Return success
  RETURN QUERY SELECT true, found_client_id, new_session_token, found_company_name, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session token
CREATE OR REPLACE FUNCTION public.validate_session(token_input text)
RETURNS TABLE(
  valid boolean,
  client_id uuid,
  company_name text,
  expires_at timestamp with time zone
) AS $$
DECLARE
  found_client_id uuid;
  found_company_name text;
  found_expires_at timestamp with time zone;
BEGIN
  -- Validate session token
  SELECT s.client_id, c.company_name, s.expires_at
  INTO found_client_id, found_company_name, found_expires_at
  FROM public.client_sessions s
  JOIN public.clients c ON c.id = s.client_id
  WHERE s.session_token = token_input 
    AND s.is_active = true 
    AND s.expires_at > timezone('utc'::text, now())
    AND c.is_active = true;
  
  IF found_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamp with time zone;
  ELSE
    -- Update last accessed and extend session
    UPDATE public.client_sessions 
    SET 
      last_accessed = timezone('utc'::text, now()),
      expires_at = timezone('utc'::text, now()) + interval '24 hours'
    WHERE session_token = token_input;
    
    RETURN QUERY SELECT true, found_client_id, found_company_name, found_expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to logout (invalidate session)
CREATE OR REPLACE FUNCTION public.logout_session(token_input text)
RETURNS boolean AS $$
BEGIN
  UPDATE public.client_sessions 
  SET is_active = false
  WHERE session_token = token_input;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client's assistants
CREATE OR REPLACE FUNCTION public.get_client_assistants(client_id_input uuid)
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
  questions jsonb,
  is_active boolean,
  assigned_at timestamp with time zone,
  updated_at timestamp with time zone
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
    ca.questions,
    ca.is_active,
    ca.assigned_at,
    ca.updated_at
  FROM public.client_assistants ca
  WHERE ca.client_id = client_id_input AND ca.is_active = true
  ORDER BY ca.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client's phone numbers
CREATE OR REPLACE FUNCTION public.get_client_phone_numbers(client_id_input uuid)
RETURNS TABLE(
  id uuid,
  vapi_phone_id text,
  phone_number text,
  friendly_name text,
  assigned_assistant_id uuid,
  assistant_display_name text,
  is_active boolean,
  assigned_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cpn.id,
    cpn.vapi_phone_id,
    cpn.phone_number,
    cpn.friendly_name,
    cpn.assigned_assistant_id,
    ca.display_name as assistant_display_name,
    cpn.is_active,
    cpn.assigned_at
  FROM public.client_phone_numbers cpn
  LEFT JOIN public.client_assistants ca ON ca.id = cpn.assigned_assistant_id
  WHERE cpn.client_id = client_id_input AND cpn.is_active = true
  ORDER BY cpn.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update assistant (only allowed fields)
CREATE OR REPLACE FUNCTION public.update_assistant(
  assistant_id_input uuid,
  client_id_input uuid,
  display_name_input text DEFAULT NULL,
  first_message_input text DEFAULT NULL,
  voice_input text DEFAULT NULL,
  model_input text DEFAULT NULL,
  eval_method_input text DEFAULT NULL,
  max_call_duration_input integer DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  updated_assistant jsonb
) AS $$
DECLARE
  assistant_exists boolean;
  updated_data jsonb;
BEGIN
  -- Check if assistant belongs to client
  SELECT EXISTS(
    SELECT 1 FROM public.client_assistants 
    WHERE id = assistant_id_input AND client_id = client_id_input AND is_active = true
  ) INTO assistant_exists;
  
  IF NOT assistant_exists THEN
    RETURN QUERY SELECT false, 'Assistant not found or access denied'::text, NULL::jsonb;
    RETURN;
  END IF;
  
  -- Update only provided fields
  UPDATE public.client_assistants 
  SET 
    display_name = COALESCE(display_name_input, display_name),
    first_message = COALESCE(first_message_input, first_message),
    voice = COALESCE(voice_input, voice),
    model = COALESCE(model_input, model),
    eval_method = COALESCE(eval_method_input, eval_method),
    max_call_duration = COALESCE(max_call_duration_input, max_call_duration),
    updated_at = timezone('utc'::text, now())
  WHERE id = assistant_id_input
  RETURNING jsonb_build_object(
    'id', id,
    'display_name', display_name,
    'first_message', first_message,
    'voice', voice,
    'model', model,
    'eval_method', eval_method,
    'max_call_duration', max_call_duration,
    'updated_at', updated_at
  ) INTO updated_data;
  
  RETURN QUERY SELECT true, 'Assistant updated successfully'::text, updated_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client info for PIN change verification
CREATE OR REPLACE FUNCTION public.get_client_info(client_id_input uuid)
RETURNS TABLE(
  client_id uuid,
  company_name text,
  contact_email text,
  pin_changed_at timestamp with time zone,
  masked_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.company_name,
    c.contact_email,
    c.pin_changed_at,
    CONCAT(
      LEFT(c.contact_email, 2),
      '***',
      SUBSTRING(c.contact_email FROM POSITION('@' IN c.contact_email))
    ) as masked_email
  FROM public.clients c
  WHERE c.id = client_id_input AND c.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change PIN (with current PIN and email verification)
CREATE OR REPLACE FUNCTION public.change_pin(
  client_id_input uuid,
  current_pin_input text,
  new_pin_input text,
  email_input text
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
  -- Validate new PIN format
  IF new_pin_input !~ '^[0-9]{6,8}$' THEN
    RETURN QUERY SELECT false, 'New PIN must be 6-8 digits'::text, 'INVALID_PIN_FORMAT'::text;
    RETURN;
  END IF;
  
  -- Verify current PIN and email
  SELECT EXISTS(
    SELECT 1 FROM public.clients 
    WHERE id = client_id_input 
      AND pin = current_pin_input 
      AND contact_email = email_input
      AND is_active = true
  ) INTO current_pin_valid;
  
  IF NOT current_pin_valid THEN
    RETURN QUERY SELECT false, 'Current PIN or email is incorrect'::text, 'INVALID_CREDENTIALS'::text;
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
  
  -- Invalidate all sessions for this client
  UPDATE public.client_sessions 
  SET is_active = false
  WHERE client_id = client_id_input;
  
  RETURN QUERY SELECT true, 'PIN changed successfully. Please login again.'::text, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION 3: ANALYTICS FUNCTIONS
-- ============================================================================

-- Function to process call log and update analytics
CREATE OR REPLACE FUNCTION public.process_call_analytics(
  client_id_input uuid,
  assistant_id_input uuid,
  call_date date,
  duration_seconds_input integer DEFAULT 0,
  cost_cents_input integer DEFAULT 0,
  was_successful boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
  -- Insert or update daily analytics
  INSERT INTO public.call_analytics (
    client_id,
    assistant_id,
    date,
    total_calls,
    successful_calls,
    failed_calls,
    total_duration_seconds,
    total_cost_cents
  )
  VALUES (
    client_id_input,
    assistant_id_input,
    call_date,
    1,
    CASE WHEN was_successful THEN 1 ELSE 0 END,
    CASE WHEN was_successful THEN 0 ELSE 1 END,
    duration_seconds_input,
    cost_cents_input
  )
  ON CONFLICT (client_id, assistant_id, date)
  DO UPDATE SET
    total_calls = call_analytics.total_calls + 1,
    successful_calls = call_analytics.successful_calls + (CASE WHEN was_successful THEN 1 ELSE 0 END),
    failed_calls = call_analytics.failed_calls + (CASE WHEN was_successful THEN 0 ELSE 1 END),
    total_duration_seconds = call_analytics.total_duration_seconds + duration_seconds_input,
    total_cost_cents = call_analytics.total_cost_cents + cost_cents_input,
    updated_at = timezone('utc'::text, now());
  
  -- Update calculated fields
  UPDATE public.call_analytics
  SET
    average_call_duration = CASE 
      WHEN total_calls > 0 THEN ROUND(total_duration_seconds::numeric / total_calls, 2)
      ELSE 0
    END,
    success_rate = CASE 
      WHEN total_calls > 0 THEN ROUND((successful_calls::numeric / total_calls) * 100, 2)
      ELSE 0
    END
  WHERE client_id = client_id_input 
    AND assistant_id = assistant_id_input 
    AND date = call_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client dashboard analytics
CREATE OR REPLACE FUNCTION public.get_client_analytics(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  successful_calls bigint,
  failed_calls bigint,
  total_duration_hours numeric,
  total_cost_dollars numeric,
  average_call_duration numeric,
  success_rate numeric,
  calls_by_day jsonb,
  calls_by_assistant jsonb
) AS $$
DECLARE
  start_date date;
BEGIN
  start_date := CURRENT_DATE - (days_back || ' days')::interval;
  
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      ca.date,
      SUM(ca.total_calls) as day_calls,
      SUM(ca.successful_calls) as day_successful,
      SUM(ca.total_duration_seconds) as day_duration,
      SUM(ca.total_cost_cents) as day_cost
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
    GROUP BY ca.date
    ORDER BY ca.date
  ),
  assistant_stats AS (
    SELECT 
      cas.display_name,
      SUM(ca.total_calls) as assistant_calls,
      SUM(ca.successful_calls) as assistant_successful,
      SUM(ca.total_duration_seconds) as assistant_duration,
      SUM(ca.total_cost_cents) as assistant_cost
    FROM public.call_analytics ca
    JOIN public.client_assistants cas ON cas.id = ca.assistant_id
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
    GROUP BY cas.id, cas.display_name
    ORDER BY assistant_calls DESC
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(ca.total_calls), 0) as total_calls,
      COALESCE(SUM(ca.successful_calls), 0) as successful_calls,
      COALESCE(SUM(ca.failed_calls), 0) as failed_calls,
      COALESCE(SUM(ca.total_duration_seconds), 0) as total_duration_seconds,
      COALESCE(SUM(ca.total_cost_cents), 0) as total_cost_cents
    FROM public.call_analytics ca
    WHERE ca.client_id = client_id_input 
      AND ca.date >= start_date
  )
  SELECT 
    t.total_calls,
    t.successful_calls,
    t.failed_calls,
    ROUND(t.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(t.total_cost_cents::numeric / 100, 2) as total_cost_dollars,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND(t.total_duration_seconds::numeric / t.total_calls, 2)
      ELSE 0
    END as average_call_duration,
    CASE 
      WHEN t.total_calls > 0 THEN ROUND((t.successful_calls::numeric / t.total_calls) * 100, 2)
      ELSE 0
    END as success_rate,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', ds.date,
          'calls', ds.day_calls,
          'successful', ds.day_successful,
          'duration_minutes', ROUND(ds.day_duration::numeric / 60, 2),
          'cost_dollars', ROUND(ds.day_cost::numeric / 100, 2)
        )
      )
      FROM daily_stats ds
    ) as calls_by_day,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'assistant_name', ass.display_name,
          'calls', ass.assistant_calls,
          'successful', ass.assistant_successful,
          'duration_minutes', ROUND(ass.assistant_duration::numeric / 60, 2),
          'cost_dollars', ROUND(ass.assistant_cost::numeric / 100, 2)
        )
      )
      FROM assistant_stats ass
    ) as calls_by_assistant
  FROM totals t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION 4: ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- Function to get recent calls for dashboard
CREATE OR REPLACE FUNCTION public.get_recent_calls(
  client_id_input uuid,
  limit_rows integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  call_time timestamp with time zone,
  duration_seconds integer,
  cost numeric,
  caller_number text,
  call_status text,
  assistant_display_name text,
  success_evaluation boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.call_time,
    cl.duration_seconds,
    cl.cost,
    cl.caller_number,
    cl.call_status,
    cl.assistant_display_name,
    cl.success_evaluation
  FROM public.call_logs cl
  WHERE cl.client_id = client_id_input
  ORDER BY cl.call_time DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard analytics with proper field references
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(
  client_id_input uuid,
  days_back integer DEFAULT 30
)
RETURNS TABLE(
  total_calls bigint,
  total_duration_hours numeric,
  avg_duration_minutes numeric,
  success_rate numeric,
  recent_calls jsonb
) AS $$
DECLARE
  start_date timestamp with time zone;
BEGIN
  start_date := timezone('utc'::text, now()) - (days_back || ' days')::interval;
  
  RETURN QUERY
  WITH call_stats AS (
    SELECT 
      COUNT(*) as total_calls,
      COALESCE(SUM(duration_seconds), 0) as total_duration_seconds,
      COALESCE(AVG(duration_seconds), 0) as avg_duration_seconds,
      COALESCE(
        SUM(CASE WHEN call_status = 'completed' THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100, 
        0
      ) as success_rate
    FROM public.call_logs
    WHERE client_id = client_id_input 
      AND call_time >= start_date
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', cl.id,
        'call_time', cl.call_time,
        'duration_seconds', cl.duration_seconds,
        'cost', cl.cost,
        'caller_number', cl.caller_number,
        'call_status', cl.call_status,
        'assistant_display_name', cl.assistant_display_name
      ) ORDER BY cl.call_time DESC
    ) as recent_calls
    FROM (
      SELECT * FROM public.call_logs
      WHERE client_id = client_id_input
      ORDER BY call_time DESC
      LIMIT 10
    ) cl
  )
  SELECT 
    cs.total_calls,
    ROUND(cs.total_duration_seconds::numeric / 3600, 2) as total_duration_hours,
    ROUND(cs.avg_duration_seconds::numeric / 60, 2) as avg_duration_minutes,
    ROUND(cs.success_rate, 2) as success_rate,
    r.recent_calls
  FROM call_stats cs, recent r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get client's total usage
CREATE OR REPLACE FUNCTION public.get_client_usage(
  client_id_input uuid,
  start_date_input date DEFAULT NULL,
  end_date_input date DEFAULT NULL
)
RETURNS TABLE(
  total_minutes numeric,
  total_cost numeric,
  total_calls bigint,
  average_call_minutes numeric,
  success_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(SUM(duration_seconds), 0)::numeric / 60, 2) as total_minutes,
    ROUND(COALESCE(SUM(cost), 0)::numeric, 2) as total_cost,
    COUNT(*) as total_calls,
    ROUND(COALESCE(AVG(duration_seconds), 0)::numeric / 60, 2) as average_call_minutes,
    ROUND(
      COALESCE(
        SUM(CASE WHEN success_evaluation = true THEN 1 ELSE 0 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100,
        0
      ), 
      2
    ) as success_rate
  FROM public.call_logs
  WHERE client_id = client_id_input
    AND (start_date_input IS NULL OR call_time::date >= start_date_input)
    AND (end_date_input IS NULL OR call_time::date <= end_date_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MIGRATION 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Service role policies (allow all operations for service role)
CREATE POLICY "Service role has full access to clients" ON public.clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_assistants" ON public.client_assistants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_phone_numbers" ON public.client_phone_numbers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to call_logs" ON public.call_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to call_analytics" ON public.call_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_sessions" ON public.client_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Anonymous access policies for authentication functions
CREATE POLICY "Anonymous can authenticate with PIN" ON public.clients
  FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

CREATE POLICY "Anonymous can create sessions" ON public.client_sessions
  FOR INSERT WITH CHECK (auth.role() = 'anon');

CREATE POLICY "Anonymous can validate sessions" ON public.client_sessions
  FOR SELECT USING (auth.role() = 'anon' AND is_active = true);

CREATE POLICY "Anonymous can update own sessions" ON public.client_sessions
  FOR UPDATE USING (auth.role() = 'anon' AND is_active = true);

-- Grant execute permissions on functions to anonymous role
GRANT EXECUTE ON FUNCTION public.authenticate_pin TO anon;
GRANT EXECUTE ON FUNCTION public.validate_session TO anon;
GRANT EXECUTE ON FUNCTION public.logout_session TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_assistants TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_phone_numbers TO anon;
GRANT EXECUTE ON FUNCTION public.update_assistant TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_info TO anon;
GRANT EXECUTE ON FUNCTION public.change_pin TO anon;
GRANT EXECUTE ON FUNCTION public.get_recent_calls TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_analytics TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_analytics TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_usage TO anon;

-- Grant minimal required permissions for authentication flow
GRANT SELECT ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE ON public.client_sessions TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all tables exist
SELECT 'Tables created:' as status
UNION ALL
SELECT '✓ ' || tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'clients', 'client_assistants', 'client_phone_numbers', 
  'call_logs', 'call_analytics', 'client_sessions'
);

-- Verify all functions exist
SELECT 'Functions created:' as status
UNION ALL
SELECT '✓ ' || routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN (
  'authenticate_pin', 'validate_session', 'logout_session',
  'get_client_assistants', 'get_client_phone_numbers', 'update_assistant',
  'get_client_info', 'change_pin', 'get_recent_calls', 
  'get_dashboard_analytics', 'get_client_analytics', 'get_client_usage'
);

-- Final message
SELECT '🎉 All migrations applied successfully!' as result;