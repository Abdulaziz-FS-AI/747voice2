-- Complete authentication fix - ensures test data exists and functions work correctly
-- This migration ensures the authentication system works properly

-- 1. First, ensure the clients table has the test data
-- Use ON CONFLICT to avoid duplicate key errors if data already exists
INSERT INTO public.clients (pin, company_name, contact_email, notes, is_active) VALUES
('123456', 'Acme Corporation', 'admin@acme.com', 'Test client for development', true),
('789012', 'Tech Solutions Inc', 'contact@techsolutions.com', 'Second test client', true),
('456789', 'Global Enterprises', 'info@globalent.com', 'Third test client', true)
ON CONFLICT (pin) DO UPDATE 
SET 
  company_name = EXCLUDED.company_name,
  contact_email = EXCLUDED.contact_email,
  is_active = true,
  updated_at = timezone('utc'::text, now());

-- 2. Ensure the authenticate_pin function works correctly
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
  
  -- Log the attempt
  RAISE NOTICE 'Authentication attempt for PIN: %', LEFT(pin_input, 2) || '****';
  
  -- Validate PIN format - exactly 6 digits
  IF pin_input !~ '^[0-9]{6}$' THEN
    RAISE NOTICE 'Invalid PIN format: %', pin_input;
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, 'PIN must be exactly 6 digits'::text;
    RETURN;
  END IF;
  
  -- Find client by PIN
  SELECT c.id, c.company_name
  INTO found_client_id, found_company_name
  FROM public.clients c
  WHERE c.pin = pin_input AND c.is_active = true;
  
  IF found_client_id IS NULL THEN
    RAISE NOTICE 'No active client found for PIN: %', LEFT(pin_input, 2) || '****';
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text, 'Invalid PIN or inactive client'::text;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Client found: % (%)', found_company_name, found_client_id;
  
  -- Generate secure session token
  new_session_token := encode(gen_random_bytes(32), 'base64');
  
  -- Create new session with 24 hour expiry
  INSERT INTO public.client_sessions (
    client_id, 
    session_token, 
    ip_address, 
    user_agent,
    expires_at,
    is_active
  )
  VALUES (
    found_client_id, 
    new_session_token, 
    client_ip, 
    client_user_agent,
    timezone('utc'::text, now()) + interval '24 hours',
    true
  );
  
  RAISE NOTICE 'Session created for client: %', found_company_name;
  
  -- Return success
  RETURN QUERY SELECT true, found_client_id, new_session_token, found_company_name, NULL::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure session validation works
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
    -- Update last accessed and extend session by 24 hours
    UPDATE public.client_sessions 
    SET 
      last_accessed = timezone('utc'::text, now()),
      expires_at = timezone('utc'::text, now()) + interval '24 hours'
    WHERE session_token = token_input;
    
    RETURN QUERY SELECT true, found_client_id, found_company_name, found_expires_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create cleanup function if it doesn't exist
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.client_sessions 
  WHERE expires_at < timezone('utc'::text, now()) OR is_active = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Verify the data was inserted correctly
DO $$
DECLARE
  client_count integer;
BEGIN
  SELECT COUNT(*) INTO client_count FROM public.clients WHERE is_active = true;
  RAISE NOTICE 'Active clients in database: %', client_count;
  
  -- List the active clients
  FOR rec IN SELECT pin, company_name FROM public.clients WHERE is_active = true
  LOOP
    RAISE NOTICE 'Client: % - PIN: %', rec.company_name, LEFT(rec.pin, 2) || '****';
  END LOOP;
END $$;