-- Fix PIN validation in database functions to match API (exactly 6 digits only)
-- This ensures consistency between API and database validation

-- Update authenticate_pin function to require exactly 6 digits
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
  
  -- Validate PIN format - FIXED: exactly 6 digits only
  IF pin_input !~ '^[0-9]{6}$' THEN
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

-- Update change_pin function PIN format validation only
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
  -- Validate new PIN format - FIXED: exactly 6 digits only
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
  
  -- Invalidate all sessions for this client
  UPDATE public.client_sessions 
  SET is_active = false
  WHERE client_id = client_id_input;
  
  RETURN QUERY SELECT true, 'PIN changed successfully. Please login again.'::text, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_client_assistants to work with the new schema
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