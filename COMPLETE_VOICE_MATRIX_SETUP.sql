-- COMPLETE VOICE MATRIX SETUP
-- This adds the missing functions and tables to your existing schema

-- 1. Add missing tables for usage enforcement
CREATE TABLE IF NOT EXISTS public.usage_enforcement_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'enforce_limits' or 'restore_limits'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  error_message text,
  CONSTRAINT usage_enforcement_queue_pkey PRIMARY KEY (id),
  CONSTRAINT usage_enforcement_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add fields to user_assistants for timeout enforcement
ALTER TABLE public.user_assistants 
ADD COLUMN IF NOT EXISTS original_max_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS current_max_duration INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS is_usage_limited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS usage_limited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Update existing assistants with default values
UPDATE public.user_assistants 
SET 
  original_max_duration = 300,
  current_max_duration = 300,
  config = COALESCE(config, '{}')
WHERE original_max_duration IS NULL OR current_max_duration IS NULL OR config IS NULL;

-- 2. Essential functions for Voice Matrix

-- Function to get user from assistant
CREATE OR REPLACE FUNCTION public.get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE id = assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to calculate monthly usage
CREATE OR REPLACE FUNCTION public.calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
BEGIN
  -- Calculate total minutes used this month
  SELECT COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO total_minutes
  FROM public.call_logs cl
  JOIN public.user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= date_trunc('month', CURRENT_DATE)
    AND cl.status = 'completed';
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can make calls
CREATE OR REPLACE FUNCTION public.can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile RECORD;
  assistant_count INTEGER;
  minutes_used NUMERIC;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- If no profile exists, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_make_call', false,
      'can_create_assistant', false,
      'usage', jsonb_build_object(
        'minutes_used', 0,
        'minutes_limit', 0,
        'assistants_count', 0,
        'assistants_limit', 0
      ),
      'error', 'Profile not found'
    );
  END IF;
  
  -- Count assistants
  SELECT COUNT(*) INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid;
  
  -- Calculate minutes used
  minutes_used := public.calculate_monthly_usage(user_uuid);
  
  -- Build result
  result := jsonb_build_object(
    'can_make_call', minutes_used < user_profile.max_minutes_monthly,
    'can_create_assistant', assistant_count < user_profile.max_assistants,
    'usage', jsonb_build_object(
      'minutes_used', minutes_used,
      'minutes_limit', user_profile.max_minutes_monthly,
      'assistants_count', assistant_count,
      'assistants_limit', user_profile.max_assistants
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id uuid)
RETURNS boolean AS $$
DECLARE
  profile_exists boolean := false;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
  
  -- If profile doesn't exist, create it
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      current_usage_minutes, 
      max_minutes_monthly, 
      max_assistants,
      onboarding_completed
    )
    SELECT 
      user_id,
      COALESCE(au.email, 'unknown@example.com'),
      COALESCE(au.raw_user_meta_data->>'full_name', ''),
      0,
      10,
      3,
      false
    FROM auth.users au 
    WHERE au.id = user_id;
    
    RETURN true; -- Profile was created
  END IF;
  
  RETURN false; -- Profile already existed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    current_usage_minutes, 
    max_minutes_monthly, 
    max_assistants,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    10,
    3,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    max_assistants = COALESCE(profiles.max_assistants, 3),
    max_minutes_monthly = COALESCE(profiles.max_minutes_monthly, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Usage tracking trigger
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  user_limit INTEGER;
  already_limited boolean;
BEGIN
  -- Get user_id from assistant
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Set user_id in call_logs for future queries
  NEW.user_id := target_user_id;
  
  -- Only update if call is completed and has duration
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Get user's monthly limit
    SELECT max_minutes_monthly INTO user_limit
    FROM public.profiles 
    WHERE id = target_user_id;
    
    -- Check if assistants are already limited
    SELECT EXISTS(
      SELECT 1 FROM public.user_assistants 
      WHERE user_id = target_user_id AND is_usage_limited = true
    ) INTO already_limited;
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- ENFORCE LIMITS: If usage exceeds limit and not already limited
    IF new_usage >= user_limit AND NOT already_limited THEN
      INSERT INTO public.usage_enforcement_queue (
        user_id,
        action,
        created_at
      ) VALUES (
        target_user_id,
        'enforce_limits',
        now()
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Log the usage update
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      target_user_id,
      'usage_updated',
      jsonb_build_object(
        'call_id', NEW.id,
        'call_duration_seconds', NEW.duration_seconds,
        'new_total_minutes', new_usage,
        'monthly_limit', user_limit,
        'limit_exceeded', new_usage >= user_limit
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Monthly reset function
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
  user_record RECORD;
BEGIN
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Reset usage for users whose reset date is before current month
  UPDATE public.profiles 
  SET 
    current_usage_minutes = calculate_monthly_usage(id),
    usage_reset_date = current_month_start,
    updated_at = now()
  WHERE usage_reset_date < current_month_start 
     OR usage_reset_date IS NULL;
     
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Queue restoration for users who had limited assistants
  FOR user_record IN 
    SELECT DISTINCT ua.user_id 
    FROM public.user_assistants ua
    WHERE ua.is_usage_limited = true
  LOOP
    INSERT INTO public.usage_enforcement_queue (
      user_id,
      action,
      created_at
    ) VALUES (
      user_record.user_id,
      'restore_limits',
      now()
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_logs;
CREATE TRIGGER call_usage_update_trigger
  BEFORE INSERT OR UPDATE OF duration_seconds, status ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_vapi_id ON public.user_assistants(vapi_assistant_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_usage_limited ON public.user_assistants(user_id, is_usage_limited);
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id_date ON public.call_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_usage_tracking ON public.profiles(current_usage_minutes, max_minutes_monthly);
CREATE INDEX IF NOT EXISTS idx_usage_enforcement_queue_processing ON public.usage_enforcement_queue(processed, created_at) WHERE NOT processed;
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_enforcement_queue_user_action ON public.usage_enforcement_queue(user_id, action) WHERE NOT processed;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_from_assistant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.usage_enforcement_queue TO authenticated;

-- 8. Fix any existing users without proper limits
UPDATE public.profiles 
SET 
  max_assistants = 3,
  max_minutes_monthly = 10,
  current_usage_minutes = 0
WHERE max_assistants IS NULL OR max_minutes_monthly IS NULL OR current_usage_minutes IS NULL;

-- Ensure all existing users have profiles
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  current_usage_minutes, 
  max_minutes_monthly, 
  max_assistants,
  onboarding_completed
)
SELECT 
  au.id,
  COALESCE(au.email, 'unknown@example.com'),
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  0,
  10,
  3,
  false
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Voice Matrix setup completed successfully!' as result;