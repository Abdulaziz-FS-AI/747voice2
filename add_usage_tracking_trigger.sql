-- Critical Fix: Add automatic usage tracking when calls complete
-- This trigger updates user's current_usage_minutes when call logs are inserted/updated

-- Create function to update user usage when call completes
CREATE OR REPLACE FUNCTION public.update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  user_id_to_update UUID;
  call_minutes INTEGER;
BEGIN
  -- Get the user_id from the assistant
  SELECT ua.user_id INTO user_id_to_update
  FROM user_assistants ua
  WHERE ua.id = NEW.assistant_id;

  -- If no user found, exit
  IF user_id_to_update IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate minutes (round up to nearest minute)
  call_minutes := CEIL(COALESCE(NEW.duration_seconds, 0)::NUMERIC / 60);

  -- Only update if we have a positive duration
  IF call_minutes > 0 THEN
    -- Update user's current usage
    UPDATE public.profiles 
    SET current_usage_minutes = COALESCE(current_usage_minutes, 0) + call_minutes
    WHERE id = user_id_to_update;

    -- Log the usage event
    INSERT INTO public.subscription_events (
      user_id,
      event_type,
      metadata
    ) VALUES (
      user_id_to_update,
      'usage_tracked',
      jsonb_build_object(
        'call_id', NEW.id,
        'minutes_added', call_minutes,
        'total_duration_seconds', NEW.duration_seconds
      )
    );

    -- Check if user has exceeded limits
    DECLARE
      user_profile RECORD;
    BEGIN
      SELECT current_usage_minutes, max_minutes_monthly, subscription_type
      INTO user_profile
      FROM public.profiles
      WHERE id = user_id_to_update;

      -- If usage exceeds limit, log event and potentially disable assistants
      IF user_profile.current_usage_minutes > user_profile.max_minutes_monthly THEN
        INSERT INTO public.subscription_events (
          user_id,
          event_type,
          metadata
        ) VALUES (
          user_id_to_update,
          'usage_limit_exceeded',
          jsonb_build_object(
            'usage', user_profile.current_usage_minutes,
            'limit', user_profile.max_minutes_monthly,
            'overage', user_profile.current_usage_minutes - user_profile.max_minutes_monthly,
            'subscription_type', user_profile.subscription_type
          )
        );

        -- Optionally disable assistants (uncomment if desired)
        -- UPDATE public.user_assistants 
        -- SET is_disabled = true, 
        --     disabled_at = NOW(), 
        --     disabled_reason = 'usage_limit_exceeded',
        --     assistant_state = 'disabled_usage'
        -- WHERE user_id = user_id_to_update 
        --   AND is_disabled = false;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire when call logs are inserted (call completes)
DROP TRIGGER IF EXISTS trigger_update_usage_on_call ON public.call_logs;
CREATE TRIGGER trigger_update_usage_on_call
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_usage_on_call();

-- Create trigger to fire when call logs are updated with duration
DROP TRIGGER IF EXISTS trigger_update_usage_on_call_update ON public.call_logs;
CREATE TRIGGER trigger_update_usage_on_call_update
  AFTER UPDATE OF duration_seconds ON public.call_logs
  FOR EACH ROW
  WHEN (OLD.duration_seconds IS DISTINCT FROM NEW.duration_seconds AND NEW.duration_seconds > 0)
  EXECUTE FUNCTION public.update_user_usage_on_call();

-- Create function to reset monthly usage (run this monthly via cron or manual)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  -- Reset all users who have passed their billing cycle
  UPDATE public.profiles 
  SET current_usage_minutes = 0,
      billing_cycle_start = billing_cycle_end,
      billing_cycle_end = billing_cycle_end + INTERVAL '30 days'
  WHERE billing_cycle_end <= NOW();

  GET DIAGNOSTICS reset_count = ROW_COUNT;

  -- Log reset events
  INSERT INTO public.subscription_events (user_id, event_type, metadata)
  SELECT id, 'monthly_reset', jsonb_build_object('reset_date', NOW())
  FROM public.profiles 
  WHERE billing_cycle_start = billing_cycle_end - INTERVAL '30 days';

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on usage lookups
CREATE INDEX IF NOT EXISTS idx_profiles_usage_lookup 
ON public.profiles(current_usage_minutes, max_minutes_monthly) 
WHERE subscription_status = 'active';

-- Create index for call logs performance
CREATE INDEX IF NOT EXISTS idx_call_logs_duration 
ON public.call_logs(duration_seconds) 
WHERE duration_seconds > 0;