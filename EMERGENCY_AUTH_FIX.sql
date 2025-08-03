-- EMERGENCY AUTH FIX - Run this in Supabase SQL Editor
-- This creates a more robust profile creation system

-- 1. First, let's see what users exist without profiles
SELECT 
  'DIAGNOSIS' as step,
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as users_missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- 2. Create enhanced profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    current_usage_minutes, 
    max_minutes_monthly, 
    max_assistants,
    usage_reset_date,
    onboarding_completed,
    setup_completed,
    subscription_type,
    subscription_status,
    billing_cycle_start,
    billing_cycle_end,
    payment_method_type
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'User'
    ),
    0,
    10,
    3,
    CURRENT_DATE,
    false,
    false,
    'free',
    'active',
    now(),
    (now() + interval '1 month'),
    'none'
  );
  
  -- Log successful profile creation
  RAISE NOTICE 'Profile created for user: % (email: %)', NEW.id, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user % (%): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix ALL existing users who don't have profiles
INSERT INTO public.profiles (
  id, 
  email, 
  full_name, 
  current_usage_minutes, 
  max_minutes_monthly, 
  max_assistants,
  usage_reset_date,
  onboarding_completed,
  setup_completed,
  subscription_type,
  subscription_status,
  billing_cycle_start,
  billing_cycle_end,
  payment_method_type,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name', 
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'User'
  ),
  0,
  10,
  3,
  CURRENT_DATE,
  false,
  false,
  'free',
  'active',
  now(),
  (now() + interval '1 month'),
  'none',
  u.created_at,
  u.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 6. Verify the fix worked
SELECT 
  'VERIFICATION' as step,
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as remaining_missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- 7. Show recent profiles created
SELECT 
  'RECENT_PROFILES' as step,
  email,
  full_name,
  subscription_type,
  created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'EMERGENCY_FIX_COMPLETE' as status;