-- Add profile creation trigger for existing Voice Matrix database
-- Run this if you've already set up your database and need to add automatic profile creation

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    0,
    10,
    3
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
SELECT 'Profile creation trigger added successfully!' as result;