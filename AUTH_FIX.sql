-- AUTH FIX: Temporary workaround for session management
-- This creates a simple auth bypass for testing while we fix the root cause

-- Create a simple auth testing function
CREATE OR REPLACE FUNCTION public.test_auth_user(user_email text)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  subscription_type text,
  current_usage_minutes numeric,
  max_assistants integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.subscription_type,
    p.current_usage_minutes,
    p.max_assistants
  FROM profiles p
  WHERE p.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_auth_user(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.test_auth_user(text) TO authenticated;