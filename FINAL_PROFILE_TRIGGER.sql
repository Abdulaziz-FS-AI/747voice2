-- FINAL PROFILE TRIGGER - Matches your exact schema
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Create the profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Insert profile with your exact schema structure
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_type,
    subscription_status,
    billing_cycle_start,
    billing_cycle_end,
    payment_method_type,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    usage_reset_date,
    onboarding_completed,
    setup_completed
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name', 
      split_part(NEW.email, '@', 1)
    ),
    'free',
    'active',
    now(),
    (now() + interval '1 month'),
    'none',
    0,
    10,
    3,
    CURRENT_DATE,
    false,
    false
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user creation if profile creation fails
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix any existing users without profiles
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  billing_cycle_start,
  billing_cycle_end,
  payment_method_type,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants,
  usage_reset_date,
  onboarding_completed,
  setup_completed,
  created_at,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  'free',
  'active',
  now(),
  (now() + interval '1 month'),
  'none',
  0,
  10,
  3,
  CURRENT_DATE,
  false,
  false,
  u.created_at,
  u.updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Verify the fix
SELECT 
  'STATUS' as check_type,
  COUNT(*) as total_auth_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

SELECT 'PROFILE_TRIGGER_INSTALLED' as status;