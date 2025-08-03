-- Add missing database functions for Voice Matrix

-- Function to calculate monthly usage
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC := 0;
BEGIN
  -- Calculate total minutes used this month
  SELECT COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO total_minutes
  FROM call_logs cl
  JOIN user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= date_trunc('month', CURRENT_DATE)
    AND cl.status = 'completed';
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can make calls
CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile RECORD;
  assistant_count INTEGER;
  minutes_used NUMERIC;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = user_uuid;
  
  -- If no profile exists, return false
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
      'error', 'Profile not found'
    );
  END IF;
  
  -- Count assistants
  SELECT COUNT(*) INTO assistant_count
  FROM user_assistants
  WHERE user_id = user_uuid;
  
  -- Calculate minutes used
  minutes_used := calculate_monthly_usage(user_uuid);
  
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

-- Function to get user from assistant
CREATE OR REPLACE FUNCTION get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
DECLARE
  user_uuid uuid;
BEGIN
  SELECT user_id INTO user_uuid
  FROM user_assistants
  WHERE id = assistant_uuid;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage (called by cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    current_usage_minutes = 0,
    usage_reset_date = CURRENT_DATE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_from_assistant(uuid) TO authenticated;

-- Success message
SELECT 'All missing functions and triggers added successfully!' as result;