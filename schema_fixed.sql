-- IMPROVED TRIGGER FUNCTION TO HANDLE PLAN SELECTION
-- This replaces the existing trigger with better plan handling

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that reads plan from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  selected_plan text;
  max_minutes integer;
  max_assistants integer;
BEGIN
  -- Get the selected plan from user metadata (set by signup process)
  selected_plan := COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free');
  
  -- Set limits based on plan
  IF selected_plan = 'pro' THEN
    max_minutes := 100;
    max_assistants := 10;
  ELSE
    max_minutes := 10;
    max_assistants := 1;
    selected_plan := 'free'; -- Ensure it's exactly 'free'
  END IF;
  
  -- Create profile with proper plan settings
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
    selected_plan,
    'active',
    0,
    max_minutes,
    max_assistants,
    NOW(),
    NOW() + INTERVAL '30 days',
    'none',
    false, -- onboarding_completed
    false, -- setup_completed (will be set to true after plan selection)
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile with plan from user metadata and proper limits';

SELECT 'Improved trigger function installed successfully!' as status;