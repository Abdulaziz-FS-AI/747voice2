-- MINIMAL FIX FOR ASSISTANT CREATION LIMITS
-- Only adds missing pieces without overriding existing schema

-- 1. Ensure all existing profiles have correct limits (safe update)
UPDATE public.profiles 
SET 
  max_assistants = 3,
  max_minutes_monthly = 10,
  current_usage_minutes = COALESCE(current_usage_minutes, 0)
WHERE max_assistants IS NULL 
   OR max_minutes_monthly IS NULL 
   OR current_usage_minutes IS NULL;

-- 2. Add ensure_profile_exists function (only if it doesn't exist)
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

-- 3. Grant permission for this function
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid) TO authenticated;

-- 4. Create profiles for any existing users who don't have them (safe insert)
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
SELECT 
  'Assistant creation limits fixed! All users now have max_assistants = 3' as result,
  COUNT(*) as profiles_updated
FROM public.profiles 
WHERE max_assistants = 3;