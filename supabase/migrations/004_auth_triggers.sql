-- Auth Triggers for Voice Matrix
-- This migration creates triggers to handle user signup and profile creation

-- =============================================
-- PROFILE CREATION TRIGGER
-- =============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    company_name,
    phone,
    role,
    subscription_status,
    trial_ends_at,
    onboarding_completed,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'admin', -- First user in a team is always admin
    'trial',
    NOW() + INTERVAL '14 days',
    false,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PROFILE UPDATE FUNCTION
-- =============================================

-- Function to handle profile updates and sync with auth.users
CREATE OR REPLACE FUNCTION public.handle_profile_update() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update the email in auth.users if it changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE auth.users 
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  -- Log the profile update in audit logs
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    NEW.id,
    'profile_updated',
    'profile',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after profile update
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_update();

-- =============================================
-- TEAM CREATION FUNCTION
-- =============================================

-- Function to create a team when a user completes onboarding
CREATE OR REPLACE FUNCTION public.create_default_team(
  user_id UUID,
  team_name TEXT,
  team_slug TEXT
) RETURNS UUID AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Create the team
  INSERT INTO public.teams (
    name,
    slug,
    owner_id,
    plan_type,
    max_agents,
    max_assistants,
    max_minutes,
    created_at,
    updated_at
  ) VALUES (
    team_name,
    team_slug,
    user_id,
    'starter',
    1,
    1,
    1000,
    NOW(),
    NOW()
  ) RETURNING id INTO new_team_id;
  
  -- Update the user's profile to link them to the team
  UPDATE public.profiles 
  SET 
    team_id = new_team_id,
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Log team creation
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    user_id,
    'team_created',
    'team',
    new_team_id,
    jsonb_build_object('team_name', team_name, 'team_slug', team_slug),
    NOW()
  );
  
  RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- USER DELETION CLEANUP
-- =============================================

-- Function to handle user deletion and cleanup
CREATE OR REPLACE FUNCTION public.handle_user_delete() 
RETURNS TRIGGER AS $$
BEGIN
  -- Log the user deletion
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    created_at
  ) VALUES (
    OLD.id,
    'user_deleted',
    'profile',
    OLD.id,
    to_jsonb(OLD),
    NOW()
  );
  
  -- Delete associated data (cascading deletes will handle most of this)
  -- But we want to explicitly log important deletions
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute cleanup before user deletion
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- =============================================
-- SUBSCRIPTION STATUS UPDATE FUNCTION
-- =============================================

-- Function to update subscription status (called by webhooks)
CREATE OR REPLACE FUNCTION public.update_subscription_status(
  user_email TEXT,
  new_status subscription_status,
  subscription_id TEXT DEFAULT NULL,
  plan_type plan_type DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  user_profile profiles;
BEGIN
  -- Find the user by email
  SELECT * INTO user_profile
  FROM public.profiles 
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update the profile
  UPDATE public.profiles 
  SET 
    subscription_status = new_status,
    updated_at = NOW()
  WHERE id = user_profile.id;
  
  -- Update the team if provided
  IF user_profile.team_id IS NOT NULL AND plan_type IS NOT NULL THEN
    UPDATE public.teams 
    SET 
      subscription_id = COALESCE(subscription_id, teams.subscription_id),
      plan_type = plan_type,
      max_agents = CASE plan_type
        WHEN 'starter' THEN 1
        WHEN 'professional' THEN 3
        WHEN 'team' THEN 10
        WHEN 'enterprise' THEN 50
        ELSE max_agents
      END,
      max_assistants = CASE plan_type
        WHEN 'starter' THEN 1
        WHEN 'professional' THEN 3
        WHEN 'team' THEN 10
        WHEN 'enterprise' THEN 25
        ELSE max_assistants
      END,
      max_minutes = CASE plan_type
        WHEN 'starter' THEN 1000
        WHEN 'professional' THEN 5000
        WHEN 'team' THEN 20000
        WHEN 'enterprise' THEN 100000
        ELSE max_minutes
      END,
      updated_at = NOW()
    WHERE id = user_profile.team_id;
  END IF;
  
  -- Log the subscription update
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    created_at
  ) VALUES (
    user_profile.id,
    'subscription_updated',
    'subscription',
    user_profile.team_id,
    jsonb_build_object(
      'status', new_status,
      'plan_type', plan_type,
      'subscription_id', subscription_id
    ),
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if user trial has expired
CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  profile profiles;
BEGIN
  SELECT * INTO profile
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  RETURN (
    profile.subscription_status = 'trial' 
    AND profile.trial_ends_at < NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id UUID)
RETURNS TABLE (
  can_manage_team BOOLEAN,
  can_manage_assistants BOOLEAN,
  can_view_calls BOOLEAN,
  can_manage_leads BOOLEAN,
  can_view_analytics BOOLEAN,
  is_trial_expired BOOLEAN
) AS $$
DECLARE
  user_profile profiles;
BEGIN
  SELECT * INTO user_profile
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, FALSE, FALSE, FALSE, TRUE;
  END IF;
  
  RETURN QUERY SELECT 
    user_profile.role = 'admin',
    user_profile.role IN ('admin', 'agent'),
    user_profile.role IN ('admin', 'agent', 'viewer'),
    user_profile.role IN ('admin', 'agent'),
    user_profile.role IN ('admin', 'agent', 'viewer'),
    public.is_trial_expired(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_default_team(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_subscription_status(TEXT, subscription_status, TEXT, plan_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trial_expired(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(UUID) TO authenticated;