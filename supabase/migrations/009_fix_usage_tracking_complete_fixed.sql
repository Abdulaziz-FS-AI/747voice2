-- Comprehensive fix for usage tracking and webhook integration
-- This migration creates all necessary structures for call minute tracking

-- 1. Drop existing view if it exists and create v_user_profile view that Make.com expects
DROP VIEW IF EXISTS public.v_user_profile CASCADE;

CREATE VIEW public.v_user_profile AS
SELECT 
  p.id as user_id,  -- Map id to user_id for webhook compatibility
  p.id,
  p.email,
  p.full_name,
  p.subscription_type,
  p.subscription_status,
  p.max_assistants,
  p.max_minutes_monthly,
  p.current_usage_minutes,
  p.billing_cycle_start,
  p.billing_cycle_end,
  p.created_at,
  p.updated_at,
  -- Calculate remaining minutes
  (p.max_minutes_monthly - COALESCE(p.current_usage_minutes, 0)) as remaining_minutes,
  -- Calculate usage percentage
  CASE 
    WHEN p.max_minutes_monthly > 0 THEN 
      ROUND((COALESCE(p.current_usage_minutes, 0)::numeric / p.max_minutes_monthly::numeric) * 100, 2)
    ELSE 0
  END as usage_percentage,
  -- Check if over limit
  (COALESCE(p.current_usage_minutes, 0) >= p.max_minutes_monthly) as is_over_limit
FROM profiles p;

-- Grant permissions
GRANT SELECT ON public.v_user_profile TO authenticated;
GRANT SELECT ON public.v_user_profile TO service_role;
GRANT SELECT ON public.v_user_profile TO anon;

-- 2. Create function to track call usage (improved version)
CREATE OR REPLACE FUNCTION public.track_call_usage(
  p_assistant_id UUID,
  p_duration_seconds INTEGER,
  p_call_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_minutes_used INTEGER;
  v_profile RECORD;
  v_result JSONB;
BEGIN
  -- Get user from assistant
  SELECT ua.user_id INTO v_user_id
  FROM user_assistants ua
  WHERE ua.id = p_assistant_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Assistant not found'
    );
  END IF;

  -- Calculate minutes (round up)
  v_minutes_used := CEIL(p_duration_seconds::numeric / 60);

  -- Get current profile data
  SELECT * INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  -- Update usage
  UPDATE profiles
  SET current_usage_minutes = COALESCE(current_usage_minutes, 0) + v_minutes_used,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Log the event
  INSERT INTO subscription_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    v_user_id,
    'usage_tracked',
    jsonb_build_object(
      'call_id', p_call_id,
      'assistant_id', p_assistant_id,
      'minutes_added', v_minutes_used,
      'duration_seconds', p_duration_seconds,
      'total_usage', v_profile.current_usage_minutes + v_minutes_used,
      'limit', v_profile.max_minutes_monthly
    )
  );

  -- Check if over limit
  IF (v_profile.current_usage_minutes + v_minutes_used) > v_profile.max_minutes_monthly THEN
    -- Log limit exceeded
    INSERT INTO subscription_events (
      user_id,
      event_type,
      metadata
    ) VALUES (
      v_user_id,
      'usage_limit_exceeded',
      jsonb_build_object(
        'usage', v_profile.current_usage_minutes + v_minutes_used,
        'limit', v_profile.max_minutes_monthly,
        'overage', (v_profile.current_usage_minutes + v_minutes_used) - v_profile.max_minutes_monthly
      )
    );

    -- Disable assistants
    UPDATE user_assistants
    SET is_disabled = true,
        disabled_at = NOW(),
        disabled_reason = 'usage_limit_exceeded',
        assistant_state = 'disabled_usage'
    WHERE user_id = v_user_id
      AND is_disabled = false;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'minutes_used', v_minutes_used,
    'total_usage', v_profile.current_usage_minutes + v_minutes_used,
    'limit', v_profile.max_minutes_monthly,
    'remaining', v_profile.max_minutes_monthly - (v_profile.current_usage_minutes + v_minutes_used),
    'is_over_limit', (v_profile.current_usage_minutes + v_minutes_used) > v_profile.max_minutes_monthly
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger for automatic usage tracking on call_logs
CREATE OR REPLACE FUNCTION public.auto_track_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only process if we have a duration
  IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds > 0 THEN
    -- Call the tracking function
    v_result := public.track_call_usage(
      NEW.assistant_id,
      NEW.duration_seconds,
      NEW.id
    );
    
    -- Log result if tracking failed
    IF NOT (v_result->>'success')::boolean THEN
      RAISE WARNING 'Failed to track usage for call %: %', NEW.id, v_result->>'error';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_track_usage_on_call ON public.call_logs;
DROP TRIGGER IF EXISTS trigger_track_usage_on_call_update ON public.call_logs;

-- Create new triggers
CREATE TRIGGER trigger_track_usage_on_call
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_track_usage_on_call();

CREATE TRIGGER trigger_track_usage_on_call_update
  AFTER UPDATE OF duration_seconds ON public.call_logs
  FOR EACH ROW
  WHEN (OLD.duration_seconds IS DISTINCT FROM NEW.duration_seconds)
  EXECUTE FUNCTION public.auto_track_usage_on_call();

-- 4. Create helper function for webhooks to get user info
CREATE OR REPLACE FUNCTION public.get_user_profile_by_assistant(
  p_assistant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.subscription_type,
    p.max_minutes_monthly,
    p.current_usage_minutes,
    (p.max_minutes_monthly - COALESCE(p.current_usage_minutes, 0)) as remaining_minutes,
    ua.name as assistant_name,
    ua.vapi_assistant_id
  INTO v_profile
  FROM user_assistants ua
  JOIN profiles p ON p.id = ua.user_id
  WHERE ua.id = p_assistant_id;

  IF v_profile.user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Assistant not found');
  END IF;

  RETURN to_jsonb(v_profile);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.track_call_usage(UUID, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_assistant(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_call_usage(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_by_assistant(UUID) TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_usage 
ON profiles(current_usage_minutes, max_minutes_monthly);

CREATE INDEX IF NOT EXISTS idx_user_assistants_user_lookup 
ON user_assistants(user_id) 
WHERE is_disabled = false;

CREATE INDEX IF NOT EXISTS idx_subscription_events_usage 
ON subscription_events(user_id, event_type) 
WHERE event_type IN ('usage_tracked', 'usage_limit_exceeded');

-- 7. Function to manually reset user's monthly usage
CREATE OR REPLACE FUNCTION public.reset_user_monthly_usage(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_old_usage INTEGER;
BEGIN
  -- Get current usage
  SELECT current_usage_minutes INTO v_old_usage
  FROM profiles
  WHERE id = p_user_id;

  -- Reset usage and extend billing cycle
  UPDATE profiles
  SET current_usage_minutes = 0,
      billing_cycle_start = NOW(),
      billing_cycle_end = NOW() + INTERVAL '30 days',
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the reset
  INSERT INTO subscription_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    p_user_id,
    'monthly_reset',
    jsonb_build_object(
      'old_usage', v_old_usage,
      'reset_date', NOW()
    )
  );

  -- Re-enable assistants if they were disabled due to usage
  UPDATE user_assistants
  SET is_disabled = false,
      disabled_at = NULL,
      disabled_reason = NULL,
      assistant_state = 'active'
  WHERE user_id = p_user_id
    AND disabled_reason = 'usage_limit_exceeded';

  RETURN jsonb_build_object(
    'success', true,
    'old_usage', v_old_usage,
    'message', 'Usage reset successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_user_monthly_usage(UUID) TO service_role;

-- Add comment explaining the system
COMMENT ON VIEW public.v_user_profile IS 
'User profile view with user_id mapping for webhook compatibility. Includes usage calculations.';

COMMENT ON FUNCTION public.track_call_usage IS 
'Tracks call usage minutes for a user, updates limits, and handles over-limit scenarios.';

COMMENT ON FUNCTION public.get_user_profile_by_assistant IS 
'Gets user profile information by assistant ID for webhook integrations.';