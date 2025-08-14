-- Critical Security Fixes for PIN-based System

-- Enhanced PIN validation function with security checks
CREATE OR REPLACE FUNCTION public.validate_pin_strength(pin_input text)
RETURNS TABLE(
  is_valid boolean,
  score integer,
  issues text[]
) AS $$
DECLARE
  pin_score integer := 100;
  pin_issues text[] := '{}';
  unique_digits integer;
BEGIN
  -- Basic format validation
  IF pin_input !~ '^[0-9]{6,8}$' THEN
    RETURN QUERY SELECT false, 0, ARRAY['PIN must be 6-8 digits']::text[];
    RETURN;
  END IF;
  
  -- Check for weak patterns
  IF pin_input ~ '^(\d)\1+$' THEN
    pin_issues := array_append(pin_issues, 'PIN cannot be all same digit');
    pin_score := pin_score - 50;
  END IF;
  
  IF pin_input ~ '^(123456|654321|012345|543210)' THEN
    pin_issues := array_append(pin_issues, 'PIN cannot be sequential');
    pin_score := pin_score - 40;
  END IF;
  
  -- Check for common weak PINs
  IF pin_input IN ('123456', '654321', '111111', '000000', '123123', '112233') THEN
    pin_issues := array_append(pin_issues, 'PIN is too common');
    pin_score := pin_score - 50;
  END IF;
  
  -- Check digit variety
  SELECT COUNT(DISTINCT digit)
  INTO unique_digits
  FROM unnest(string_to_array(pin_input, NULL)) AS digit;
  
  IF unique_digits < 3 THEN
    pin_issues := array_append(pin_issues, 'PIN should have at least 3 different digits');
    pin_score := pin_score - 20;
  END IF;
  
  -- Bonus for 8 digits
  IF length(pin_input) = 8 THEN
    pin_score := pin_score + 10;
  END IF;
  
  -- Ensure score doesn't go below 0
  pin_score := GREATEST(0, pin_score);
  
  RETURN QUERY SELECT (pin_score >= 60 AND array_length(pin_issues, 1) = 0), pin_score, pin_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced PIN change function with strength validation
CREATE OR REPLACE FUNCTION public.change_pin_secure(
  client_id_input uuid,
  current_pin_input text,
  new_pin_input text,
  email_input text
)
RETURNS TABLE(
  success boolean,
  message text,
  error_code text,
  pin_strength_score integer
) AS $$
DECLARE
  current_pin_valid boolean;
  pin_exists boolean;
  old_pin text;
  strength_result record;
BEGIN
  -- Validate new PIN strength first
  SELECT * INTO strength_result
  FROM public.validate_pin_strength(new_pin_input);
  
  IF NOT strength_result.is_valid THEN
    RETURN QUERY SELECT false, 
      'PIN is too weak: ' || array_to_string(strength_result.issues, ', '),
      'WEAK_PIN'::text,
      strength_result.score;
    RETURN;
  END IF;
  
  -- Verify current PIN and email
  SELECT pin INTO old_pin
  FROM public.clients 
  WHERE id = client_id_input 
    AND pin = current_pin_input 
    AND contact_email = email_input
    AND is_active = true;
  
  IF old_pin IS NULL THEN
    RETURN QUERY SELECT false, 'Current PIN or email is incorrect'::text, 'INVALID_CREDENTIALS'::text, 0;
    RETURN;
  END IF;
  
  -- Check if new PIN is too similar to old PIN
  IF old_pin = new_pin_input OR old_pin = reverse(new_pin_input) THEN
    RETURN QUERY SELECT false, 'New PIN must be different from current PIN'::text, 'PIN_TOO_SIMILAR'::text, strength_result.score;
    RETURN;
  END IF;
  
  -- Check if new PIN is already in use by another client
  SELECT EXISTS(
    SELECT 1 FROM public.clients 
    WHERE pin = new_pin_input AND id != client_id_input
  ) INTO pin_exists;
  
  IF pin_exists THEN
    RETURN QUERY SELECT false, 'PIN already in use'::text, 'PIN_ALREADY_EXISTS'::text, strength_result.score;
    RETURN;
  END IF;
  
  -- Update PIN with audit trail
  UPDATE public.clients 
  SET 
    pin = new_pin_input,
    pin_changed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = client_id_input;
  
  -- Invalidate all sessions for security
  UPDATE public.client_sessions 
  SET is_active = false
  WHERE client_id = client_id_input;
  
  -- Log PIN change for audit
  INSERT INTO public.client_audit_log (
    client_id, action, details, ip_address, created_at
  ) VALUES (
    client_id_input,
    'PIN_CHANGED',
    jsonb_build_object('strength_score', strength_result.score),
    NULL, -- IP would come from application layer
    timezone('utc'::text, now())
  );
  
  RETURN QUERY SELECT true, 'PIN changed successfully. Please login again.'::text, NULL::text, strength_result.score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS public.client_audit_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT client_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT client_audit_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_client_audit_log_client_id ON public.client_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_log_action ON public.client_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_client_audit_log_created_at ON public.client_audit_log(created_at);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  client_id_input uuid,
  action_input text,
  details_input jsonb DEFAULT '{}'::jsonb,
  ip_address_input text DEFAULT NULL,
  user_agent_input text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.client_audit_log (
    client_id, action, details, ip_address, user_agent
  ) VALUES (
    client_id_input, action_input, details_input, ip_address_input, user_agent_input
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced session validation with security logging
CREATE OR REPLACE FUNCTION public.validate_session_secure(
  token_input text,
  ip_address_input text DEFAULT NULL
)
RETURNS TABLE(
  valid boolean,
  client_id uuid,
  company_name text,
  expires_at timestamp with time zone,
  security_warning text
) AS $$
DECLARE
  found_client_id uuid;
  found_company_name text;
  found_expires_at timestamp with time zone;
  session_ip text;
  warning_msg text := NULL;
BEGIN
  -- Validate session token
  SELECT s.client_id, c.company_name, s.expires_at, s.ip_address
  INTO found_client_id, found_company_name, found_expires_at, session_ip
  FROM public.client_sessions s
  JOIN public.clients c ON c.id = s.client_id
  WHERE s.session_token = token_input 
    AND s.is_active = true 
    AND s.expires_at > timezone('utc'::text, now())
    AND c.is_active = true;
  
  IF found_client_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamp with time zone, NULL::text;
    RETURN;
  END IF;
  
  -- Check for IP changes (potential session hijacking)
  IF session_ip IS NOT NULL AND ip_address_input IS NOT NULL AND session_ip != ip_address_input THEN
    warning_msg := 'IP address changed during session';
    
    -- Log potential security incident
    PERFORM public.log_security_event(
      found_client_id,
      'SUSPICIOUS_IP_CHANGE',
      jsonb_build_object(
        'original_ip', session_ip,
        'new_ip', ip_address_input,
        'session_token_hash', encode(sha256(token_input::bytea), 'hex')
      ),
      ip_address_input
    );
  END IF;
  
  -- Update session activity
  UPDATE public.client_sessions 
  SET 
    last_accessed = timezone('utc'::text, now()),
    expires_at = timezone('utc'::text, now()) + interval '4 hours', -- Reduced from 24 hours
    ip_address = COALESCE(ip_address_input, ip_address) -- Update IP if provided
  WHERE session_token = token_input;
  
  RETURN QUERY SELECT true, found_client_id, found_company_name, found_expires_at, warning_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_logins(
  client_id_input uuid,
  hours_back integer DEFAULT 24
)
RETURNS TABLE(
  total_attempts integer,
  failed_attempts integer,
  unique_ips integer,
  is_suspicious boolean,
  risk_score integer
) AS $$
DECLARE
  start_time timestamp with time zone;
  total_count integer := 0;
  failed_count integer := 0;
  ip_count integer := 0;
  risk integer := 0;
BEGIN
  start_time := timezone('utc'::text, now()) - (hours_back || ' hours')::interval;
  
  -- Count login attempts from audit log
  SELECT COUNT(*), COUNT(CASE WHEN details->>'success' = 'false' THEN 1 END)
  INTO total_count, failed_count
  FROM public.client_audit_log
  WHERE client_id = client_id_input
    AND action IN ('LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED')
    AND created_at >= start_time;
  
  -- Count unique IPs
  SELECT COUNT(DISTINCT ip_address)
  INTO ip_count
  FROM public.client_audit_log
  WHERE client_id = client_id_input
    AND action IN ('LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED')
    AND created_at >= start_time
    AND ip_address IS NOT NULL;
  
  -- Calculate risk score
  risk := 0;
  IF failed_count > 10 THEN risk := risk + 30; END IF;
  IF ip_count > 3 THEN risk := risk + 20; END IF;
  IF total_count > 50 THEN risk := risk + 25; END IF;
  IF failed_count::float / NULLIF(total_count, 0) > 0.5 THEN risk := risk + 25; END IF;
  
  RETURN QUERY SELECT 
    total_count,
    failed_count, 
    ip_count,
    risk >= 50,
    risk;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_pin_strength TO anon;
GRANT EXECUTE ON FUNCTION public.change_pin_secure TO anon;
GRANT EXECUTE ON FUNCTION public.log_security_event TO anon;
GRANT EXECUTE ON FUNCTION public.validate_session_secure TO anon;
GRANT EXECUTE ON FUNCTION public.detect_suspicious_logins TO anon;

-- Enable RLS on audit log
ALTER TABLE public.client_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit log
CREATE POLICY "Service role has full access to audit log" ON public.client_audit_log
  FOR ALL USING (auth.role() = 'service_role');