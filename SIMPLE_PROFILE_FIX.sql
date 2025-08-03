-- Simple Profile Creation Fix for Voice Matrix
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Create the profile trigger function
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
    subscription_type,
    subscription_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    0,
    10,
    3,
    'free',
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix existing users (if any)
INSERT INTO public.profiles (id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants, subscription_type, subscription_status)
SELECT u.id, u.email, split_part(u.email, '@', 1), 0, 10, 3, 'free', 'active'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

SELECT 'Profile creation trigger installed successfully!' as message;