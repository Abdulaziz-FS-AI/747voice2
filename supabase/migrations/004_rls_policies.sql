-- Row Level Security (RLS) Policies for PIN-Based System

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

-- Client access through stored functions only
-- Note: Clients should only access data through RPC functions that validate session tokens
-- Direct table access is restricted to service role and specific anonymous operations

-- Additional security: Create function to verify client ownership
CREATE OR REPLACE FUNCTION public.verify_client_ownership(
  client_id_input uuid,
  session_token_input text
)
RETURNS boolean AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.client_sessions
    WHERE client_id = client_id_input
      AND session_token = session_token_input
      AND is_active = true
      AND expires_at > timezone('utc'::text, now())
  ) INTO is_valid;
  
  RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
GRANT EXECUTE ON FUNCTION public.get_assistant_analytics TO anon;
GRANT EXECUTE ON FUNCTION public.verify_client_ownership TO anon;

-- Revoke all direct table access from anonymous role
REVOKE ALL ON public.clients FROM anon;
REVOKE ALL ON public.client_assistants FROM anon;
REVOKE ALL ON public.client_phone_numbers FROM anon;
REVOKE ALL ON public.call_logs FROM anon;
REVOKE ALL ON public.call_analytics FROM anon;
REVOKE ALL ON public.client_sessions FROM anon;

-- Grant minimal required permissions for authentication flow
GRANT SELECT ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE ON public.client_sessions TO anon;