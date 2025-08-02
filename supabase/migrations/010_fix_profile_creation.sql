-- Fix profile creation for new users
-- This ensures profiles are created automatically when users sign up

-- First, ensure the handle_new_user function exists and is properly defined
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile for new user
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
    setup_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      CONCAT(
        NEW.raw_user_meta_data->>'first_name', 
        ' ', 
        NEW.raw_user_meta_data->>'last_name'
      ),
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free'),
    'active', 
    0,
    CASE 
      WHEN NEW.raw_user_meta_data->>'subscription_type' = 'pro' THEN 100
      ELSE 10
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'subscription_type' = 'pro' THEN 10
      ELSE 1
    END,
    NOW(),
    NOW() + INTERVAL '30 days',
    COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to fix existing users without profiles
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all auth users without profiles
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data,
      u.created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    -- Create profile for this user
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
      created_at,
      setup_completed
    )
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        user_record.raw_user_meta_data->>'name',
        CONCAT(
          user_record.raw_user_meta_data->>'first_name', 
          ' ', 
          user_record.raw_user_meta_data->>'last_name'
        ),
        split_part(user_record.email, '@', 1)
      ),
      COALESCE(user_record.raw_user_meta_data->>'subscription_type', 'free'),
      'active',
      0,
      CASE 
        WHEN user_record.raw_user_meta_data->>'subscription_type' = 'pro' THEN 100
        ELSE 10
      END,
      CASE 
        WHEN user_record.raw_user_meta_data->>'subscription_type' = 'pro' THEN 10
        ELSE 1
      END,
      user_record.created_at,
      user_record.created_at + INTERVAL '30 days',
      user_record.created_at,
      COALESCE((user_record.raw_user_meta_data->>'setup_completed')::boolean, false)
    );
    
    RAISE NOTICE 'Created profile for user %', user_record.email;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create profiles for existing users
SELECT public.create_missing_profiles();

-- Add a function to manually create/update profile (useful for debugging)
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id UUID)
RETURNS jsonb AS $$
DECLARE
  user_record RECORD;
  profile_record RECORD;
BEGIN
  -- Get user data
  SELECT * INTO user_record
  FROM auth.users
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Check if profile exists
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists',
      'profile', to_jsonb(profile_record)
    );
  END IF;
  
  -- Create profile
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
    setup_completed
  )
  VALUES (
    user_record.id,
    user_record.email,
    COALESCE(
      user_record.raw_user_meta_data->>'full_name',
      user_record.raw_user_meta_data->>'name',
      split_part(user_record.email, '@', 1)
    ),
    'free',
    'active',
    0,
    10,
    1,
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  )
  RETURNING * INTO profile_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile created',
    'profile', to_jsonb(profile_record)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(UUID) TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.ensure_profile_exists IS 'Ensures a profile exists for a given user ID. Creates one if missing.';