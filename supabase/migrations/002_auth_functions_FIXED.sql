-- Authentication functions for PIN-based system
-- FIXED VERSION: Corrected field references and added missing functions

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
  assistant_display_name text, -- Fixed: use correct field name
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
  masked_email text -- Added: masked email for security
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
  email_valid boolean;
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

-- Function to get recent call logs for dashboard
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