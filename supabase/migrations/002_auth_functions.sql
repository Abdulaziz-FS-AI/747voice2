-- Authentication functions for PIN-based system

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
    -- Update last activity and extend session
    UPDATE public.client_sessions 
    SET 
      last_activity = timezone('utc'::text, now()),
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
  assistant_name text,
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
    ca.display_name as assistant_name,
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
  pin_changed_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.company_name,
    c.contact_email,
    c.pin_changed_at
  FROM public.clients c
  WHERE c.id = client_id_input AND c.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change PIN (with current PIN verification)
CREATE OR REPLACE FUNCTION public.change_pin(
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
  -- Validate new PIN format
  IF new_pin_input !~ '^[0-9]{6,8}$' THEN
    RETURN QUERY SELECT false, 'New PIN must be 6-8 digits'::text, 'INVALID_PIN_FORMAT'::text;
    RETURN;
  END IF;
  
  -- Verify current PIN
  SELECT EXISTS(
    SELECT 1 FROM public.clients 
    WHERE id = client_id_input AND pin = current_pin_input AND is_active = true
  ) INTO current_pin_valid;
  
  IF NOT current_pin_valid THEN
    RETURN QUERY SELECT false, 'Current PIN is incorrect'::text, 'INVALID_CURRENT_PIN'::text;
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