-- CRITICAL DATABASE FIX FOR VOICE MATRIX
-- This fixes all the critical issues preventing user authentication and profile creation

-- 1. Fix the profiles table constraint (add CASCADE DELETE)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create the missing ensure_profile_exists function
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

-- 3. Create the calculate_monthly_usage function
DROP FUNCTION IF EXISTS public.calculate_monthly_usage(uuid);
CREATE FUNCTION public.calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC := 0;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create the can_user_make_call function  
DROP FUNCTION IF EXISTS public.can_user_make_call(uuid);
CREATE FUNCTION public.can_user_make_call(user_uuid uuid)
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
  
  -- If no profile exists, create it first
  IF NOT FOUND THEN
    PERFORM public.ensure_profile_exists(user_uuid);
    
    -- Get the newly created profile
    SELECT * INTO user_profile
    FROM public.profiles
    WHERE id = user_uuid;
    
    -- If still not found, return error
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
        'error', 'Could not create profile'
      );
    END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the profile creation trigger
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create missing utility functions
DROP FUNCTION IF EXISTS public.get_user_from_assistant(uuid);
CREATE FUNCTION public.get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT user_id INTO user_uuid
  FROM public.user_assistants
  WHERE id = assistant_uuid;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant proper permissions
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_from_assistant(uuid) TO authenticated;

-- 8. Enable RLS and create policies if not exists
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserts for new users (used by trigger)
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 9. Fix any existing users without profiles
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
SELECT 'CRITICAL DATABASE FIX APPLIED SUCCESSFULLY! 
- Profile creation trigger added
- Missing functions created
- Existing users fixed
- RLS policies updated' as result;