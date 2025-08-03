-- ===================================================================
-- VOICE MATRIX - PROFILE CREATION FIX
-- This fixes the issue where user profiles aren't created automatically
-- ===================================================================

-- 1. Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile with all required SaaS fields
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
    billing_cycle_end
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    10,  -- Free tier: 10 minutes
    3,   -- Free tier: 3 assistants
    CURRENT_DATE,
    false,
    false,
    'free',
    'active',
    now(),
    (now() + interval '1 month')
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix any existing users who don't have profiles
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
  billing_cycle_end
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  0,
  10,
  3,
  CURRENT_DATE,
  false,
  false,
  'free',
  'active',
  now(),
  (now() + interval '1 month')
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 5. Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 
  'PROFILE_CREATION_FIXED' as status,
  'New users will now automatically get profiles created' as message,
  COUNT(*) as existing_users_fixed
FROM public.profiles;