-- Add usage limit enforcement to the existing usage tracking trigger
-- This will automatically enforce 10-second timeout when users exceed 10 minutes

-- First, create a function to call the enforcement API
CREATE OR REPLACE FUNCTION notify_usage_limit_exceeded(user_uuid uuid)
RETURNS void AS $$
BEGIN
  -- Insert into a queue table that the backend will process
  INSERT INTO public.usage_enforcement_queue (
    user_id,
    action,
    created_at
  ) VALUES (
    user_uuid,
    'enforce_limits',
    now()
  ) ON CONFLICT (user_id, action) DO UPDATE SET
    created_at = now(),
    processed = false;
    
  -- Log the event
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details,
    created_at
  ) VALUES (
    user_uuid,
    'usage_limit_exceeded',
    jsonb_build_object(
      'action', 'queued_enforcement',
      'timestamp', now()
    ),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the enforcement queue table
CREATE TABLE IF NOT EXISTS public.usage_enforcement_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'enforce_limits' or 'restore_limits'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  error_message text,
  CONSTRAINT usage_enforcement_queue_pkey PRIMARY KEY (id),
  CONSTRAINT usage_enforcement_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_enforcement_queue_user_action 
ON public.usage_enforcement_queue(user_id, action) WHERE NOT processed;

-- Update the existing usage tracking function to include enforcement
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  user_limit INTEGER;
  already_limited boolean;
BEGIN
  -- Get user_id from assistant
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Set user_id in call_logs for future queries
  NEW.user_id := target_user_id;
  
  -- Only update if call is completed and has duration
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Get user's monthly limit
    SELECT max_minutes_monthly INTO user_limit
    FROM public.profiles 
    WHERE id = target_user_id;
    
    -- Check if assistants are already limited
    SELECT EXISTS(
      SELECT 1 FROM public.user_assistants 
      WHERE user_id = target_user_id AND is_usage_limited = true
    ) INTO already_limited;
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- ENFORCE LIMITS: If usage exceeds limit and not already limited
    IF new_usage >= user_limit AND NOT already_limited THEN
      PERFORM notify_usage_limit_exceeded(target_user_id);
    END IF;
    
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
        'new_total_minutes', new_usage,
        'monthly_limit', user_limit,
        'limit_exceeded', new_usage >= user_limit,
        'already_limited', already_limited
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the monthly reset function to also queue restoration
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
  user_record RECORD;
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
  
  -- Queue restoration for users who had limited assistants
  FOR user_record IN 
    SELECT DISTINCT ua.user_id 
    FROM public.user_assistants ua
    WHERE ua.is_usage_limited = true
  LOOP
    INSERT INTO public.usage_enforcement_queue (
      user_id,
      action,
      created_at
    ) VALUES (
      user_record.user_id,
      'restore_limits',
      now()
    ) ON CONFLICT (user_id, action) DO UPDATE SET
      created_at = now(),
      processed = false;
  END LOOP;
  
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
      'recalculated_usage', current_usage_minutes,
      'users_reset', reset_count
    ),
    now()
  FROM public.profiles
  WHERE usage_reset_date = current_month_start;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION notify_usage_limit_exceeded(uuid) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.usage_enforcement_queue TO authenticated;

-- Create index for efficient processing
CREATE INDEX IF NOT EXISTS idx_usage_enforcement_queue_processing 
ON public.usage_enforcement_queue(processed, created_at) WHERE NOT processed;