-- Fix assistant creation limits by ensuring all required fields exist and defaults are correct

-- 1. Ensure the profiles table has all required fields with correct defaults
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS max_assistants INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_minutes_monthly INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_usage_minutes NUMERIC DEFAULT 0;

-- 2. Update any existing profiles that might have NULL values
UPDATE public.profiles 
SET 
  max_assistants = 3 
WHERE max_assistants IS NULL;

UPDATE public.profiles 
SET 
  max_minutes_monthly = 10 
WHERE max_minutes_monthly IS NULL;

UPDATE public.profiles 
SET 
  current_usage_minutes = 0 
WHERE current_usage_minutes IS NULL;

-- 3. Fix the profile creation trigger to ensure it always sets correct values
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
    max_minutes_monthly = COALESCE(profiles.max_minutes_monthly, 10),
    current_usage_minutes = COALESCE(profiles.current_usage_minutes, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the ensure_profile_exists function works correctly
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
  ELSE
    -- Profile exists, but ensure it has correct values
    UPDATE public.profiles 
    SET 
      max_assistants = COALESCE(max_assistants, 3),
      max_minutes_monthly = COALESCE(max_minutes_monthly, 10),
      current_usage_minutes = COALESCE(current_usage_minutes, 0)
    WHERE id = user_id 
      AND (max_assistants IS NULL OR max_minutes_monthly IS NULL OR current_usage_minutes IS NULL);
  END IF;
  
  RETURN false; -- Profile already existed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a debug function to check user limits
CREATE OR REPLACE FUNCTION public.debug_user_limits(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile RECORD;
  assistant_count INTEGER;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = user_uuid;
  
  -- Count assistants
  SELECT COUNT(*) INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid;
  
  -- Build debug result
  result := jsonb_build_object(
    'profile_exists', FOUND,
    'profile_data', row_to_json(user_profile),
    'assistant_count', assistant_count,
    'can_create_assistant', 
      CASE 
        WHEN user_profile.max_assistants IS NULL THEN false
        WHEN assistant_count IS NULL THEN false
        ELSE assistant_count < user_profile.max_assistants
      END,
    'limits', jsonb_build_object(
      'max_assistants', user_profile.max_assistants,
      'current_assistants', assistant_count,
      'remaining_slots', 
        CASE 
          WHEN user_profile.max_assistants IS NULL OR assistant_count IS NULL THEN 0
          ELSE GREATEST(0, user_profile.max_assistants - assistant_count)
        END
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_user_limits(uuid) TO authenticated;

-- 7. Create a simpler can_create_assistant function for debugging
CREATE OR REPLACE FUNCTION public.can_create_assistant_debug(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile RECORD;
  assistant_count INTEGER;
  can_create boolean := false;
  error_msg text := '';
BEGIN
  -- Get user profile
  SELECT max_assistants INTO user_profile
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    error_msg := 'Profile not found';
  ELSIF user_profile.max_assistants IS NULL THEN
    error_msg := 'max_assistants is NULL';
  ELSE
    -- Count assistants
    SELECT COUNT(*) INTO assistant_count
    FROM public.user_assistants
    WHERE user_id = user_uuid;
    
    IF assistant_count IS NULL THEN
      error_msg := 'assistant_count query failed';
    ELSE
      can_create := assistant_count < user_profile.max_assistants;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'can_create', can_create,
    'error', error_msg,
    'max_assistants', user_profile.max_assistants,
    'current_count', assistant_count,
    'profile_found', FOUND
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_create_assistant_debug(uuid) TO authenticated;

-- Success message
SELECT 'Assistant creation limits fix applied successfully!' as result;