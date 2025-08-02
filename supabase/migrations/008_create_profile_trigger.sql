-- Create automatic profile creation trigger for new auth users
-- This ensures every auth.users record gets a corresponding profiles record

-- First, create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_type,
    subscription_status,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    billing_cycle_start,
    billing_cycle_end,
    payment_method_type,
    onboarding_completed,
    setup_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free')::text,
    'active',
    0,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 100
      ELSE 10
    END,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 10
      ELSE 1
    END,
    NOW(),
    NOW() + INTERVAL '30 days',
    'none',
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, false),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Create function to handle user deletion (cleanup)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  -- Clean up profile when auth user is deleted
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the deletion trigger
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Update existing auth users who don't have profiles
-- This fixes users who signed up before the trigger existed
-- Only include columns that definitely exist
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants,
  billing_cycle_start,
  billing_cycle_end,
  payment_method_type,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    CONCAT(au.raw_user_meta_data->>'first_name', ' ', au.raw_user_meta_data->>'last_name'),
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'subscription_type', 'free')::text,
  'active',
  0,
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 100
    ELSE 10
  END,
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 10
    ELSE 1
  END,
  NOW(),
  NOW() + INTERVAL '30 days',
  'none',
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Only insert for users without profiles
ON CONFLICT (id) DO NOTHING;

-- Update the newly created profiles with onboarding/setup status if columns exist
DO $$
BEGIN
    -- Check if onboarding_completed column exists and update it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        UPDATE public.profiles 
        SET onboarding_completed = false 
        WHERE onboarding_completed IS NULL;
    END IF;
    
    -- Check if setup_completed column exists and update it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' AND column_name = 'setup_completed') THEN
        UPDATE public.profiles 
        SET setup_completed = true 
        WHERE setup_completed IS NULL;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile record when new auth user is created';
COMMENT ON FUNCTION public.handle_user_delete() IS 'Cleans up profile record when auth user is deleted';

-- Create index for better performance on the join
CREATE INDEX IF NOT EXISTS idx_auth_users_id ON auth.users(id);

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Profile creation trigger installed. Existing users: %, New profiles created: %', 
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM public.profiles);
END $$;