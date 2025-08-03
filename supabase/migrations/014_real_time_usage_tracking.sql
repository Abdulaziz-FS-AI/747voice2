-- Real-time Usage Tracking Implementation
-- Automatically updates user usage when calls are completed

-- First, ensure we have the necessary fields in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_usage_minutes NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_minutes_monthly INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_assistants INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS usage_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add user_id to call_logs for easier querying (derived from assistant_id)
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id_date ON public.call_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_user ON public.call_logs(assistant_id, user_id);

-- Function to get user_id from assistant_id
CREATE OR REPLACE FUNCTION get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE id = assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate current month usage for a user
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month
  SELECT COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO total_minutes
  FROM public.call_logs cl
  JOIN public.user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= start_of_month
    AND cl.status = 'completed';
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user usage when call is completed
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
BEGIN
  -- Get user_id from assistant
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Set user_id in call_logs for future queries
  NEW.user_id := target_user_id;
  
  -- Only update if call is completed and has duration
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- Log the usage update for debugging
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      target_user_id,
      'usage_updated',
      jsonb_build_object(
        'call_id', NEW.id,
        'call_duration_seconds', NEW.duration_seconds,
        'new_total_minutes', new_usage
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for real-time usage updates
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_logs;
CREATE TRIGGER call_usage_update_trigger
  BEFORE INSERT OR UPDATE OF duration_seconds, status ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- Function to reset monthly usage (run on first day of month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
BEGIN
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Reset usage for users whose reset date is before current month
  UPDATE public.profiles 
  SET 
    current_usage_minutes = calculate_monthly_usage(id),
    usage_reset_date = current_month_start,
    updated_at = now()
  WHERE usage_reset_date < current_month_start 
     OR usage_reset_date IS NULL;
     
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log the reset action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details,
    created_at
  ) 
  SELECT 
    id,
    'monthly_usage_reset',
    jsonb_build_object(
      'reset_date', current_month_start,
      'recalculated_usage', current_usage_minutes
    ),
    now()
  FROM public.profiles
  WHERE usage_reset_date = current_month_start;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can make a call (pre-call validation)
CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_limits RECORD;
  current_usage NUMERIC;
  assistant_count INTEGER;
  result jsonb;
BEGIN
  -- Get user limits and current usage
  SELECT 
    max_minutes_monthly,
    current_usage_minutes,
    max_assistants
  INTO user_limits
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Get current assistant count
  SELECT COUNT(*)
  INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid;
  
  -- Recalculate current usage to ensure accuracy
  current_usage := calculate_monthly_usage(user_uuid);
  
  -- Build result
  result := jsonb_build_object(
    'can_make_call', current_usage < user_limits.max_minutes_monthly,
    'can_create_assistant', assistant_count < user_limits.max_assistants,
    'usage', jsonb_build_object(
      'minutes_used', current_usage,
      'minutes_limit', user_limits.max_minutes_monthly,
      'minutes_remaining', GREATEST(0, user_limits.max_minutes_monthly - current_usage),
      'assistants_count', assistant_count,
      'assistants_limit', user_limits.max_assistants,
      'assistants_remaining', GREATEST(0, user_limits.max_assistants - assistant_count)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update existing call logs to have user_id
UPDATE public.call_logs 
SET user_id = get_user_from_assistant(assistant_id)
WHERE user_id IS NULL;

-- Recalculate all user usage based on actual call logs
UPDATE public.profiles 
SET current_usage_minutes = calculate_monthly_usage(id);

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_usage_tracking ON public.profiles(current_usage_minutes, max_minutes_monthly);
CREATE INDEX IF NOT EXISTS idx_call_logs_duration_status ON public.call_logs(duration_seconds, status) WHERE status = 'completed';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_from_assistant(uuid) TO authenticated;