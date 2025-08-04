-- SIMPLIFIED SUBSCRIPTION SYSTEM FOR VOICE MATRIX
-- Everyone gets the same limits: 10 minutes + 3 assistants
-- No paid tiers, no complex billing, just simple usage tracking

-- =============================================================================
-- SIMPLIFY PROFILES TABLE - EVERYONE GETS SAME LIMITS
-- =============================================================================

-- Update any existing profiles to have consistent limits
UPDATE public.profiles 
SET 
  subscription_type = 'free',
  subscription_status = 'active',
  max_minutes_monthly = 10,
  max_assistants = 3
WHERE max_minutes_monthly != 10 OR max_assistants != 3;

-- Update profile defaults to ensure new users get correct limits
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_type SET DEFAULT 'free',
  ALTER COLUMN subscription_status SET DEFAULT 'active',
  ALTER COLUMN max_minutes_monthly SET DEFAULT 10,
  ALTER COLUMN max_assistants SET DEFAULT 3;

-- =============================================================================
-- SIMPLIFY USER CREATION FUNCTIONS
-- =============================================================================

-- Update ensure_user_profile function for simplified system
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  user_uuid uuid,
  user_email text DEFAULT NULL,
  user_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id FROM public.profiles WHERE id = user_uuid;

    -- Create if doesn't exist with simplified defaults
    IF profile_id IS NULL THEN
        INSERT INTO public.profiles (
            id, 
            email, 
            full_name,
            current_usage_minutes, 
            max_minutes_monthly,
            max_assistants,
            onboarding_completed,
            subscription_type,
            subscription_status
        ) VALUES (
            user_uuid,
            COALESCE(user_email, 'unknown@example.com'),
            COALESCE(user_name, split_part(COALESCE(user_email, 'user'), '@', 1)),
            0,  -- Start with 0 usage
            10, -- Everyone gets 10 minutes
            3,  -- Everyone gets 3 assistants
            false,
            'free',    -- Everyone is on free plan
            'active'   -- Everyone is active
        ) RETURNING id INTO profile_id;

        RAISE NOTICE 'Created simplified profile for user: % with 10min/3assistants', user_uuid;
    END IF;

    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user trigger function for simplified system
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with simplified defaults for everyone
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    subscription_type,
    subscription_status,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    onboarding_completed
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'free',    -- Everyone gets free
    'active',  -- Everyone is active
    0,         -- Start with 0 usage
    10,        -- Everyone gets 10 minutes
    3,         -- Everyone gets 3 assistants
    false
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user creation if profile creation fails
    RAISE WARNING 'Failed to create simplified profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SIMPLIFY USAGE TRACKING - REMOVE SUBSCRIPTION EVENTS COMPLEXITY
-- =============================================================================

-- Simplified track_call_usage function without subscription event logging
CREATE OR REPLACE FUNCTION public.track_call_usage(
  p_assistant_id UUID,
  p_duration_seconds INTEGER,
  p_call_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_minutes_used INTEGER;
  v_current_usage INTEGER;
  v_limit INTEGER := 10; -- Fixed limit for everyone
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

  -- Get current usage
  SELECT COALESCE(current_usage_minutes, 0) INTO v_current_usage
  FROM profiles
  WHERE id = v_user_id;

  -- Update usage
  UPDATE profiles
  SET current_usage_minutes = v_current_usage + v_minutes_used,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Check if over limit (everyone has 10 minute limit)
  IF (v_current_usage + v_minutes_used) >= v_limit THEN
    -- Disable assistants when limit reached
    UPDATE user_assistants
    SET is_disabled = true,
        disabled_at = NOW(),
        disabled_reason = 'usage_limit_exceeded',
        assistant_state = 'disabled_usage'
    WHERE user_id = v_user_id
      AND is_disabled = false;
      
    -- Log simple message (no complex subscription events)
    RAISE NOTICE 'User % exceeded 10-minute limit with % minutes', v_user_id, v_current_usage + v_minutes_used;
  END IF;

  -- Return simplified result
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'minutes_used', v_minutes_used,
    'total_usage', v_current_usage + v_minutes_used,
    'limit', v_limit,
    'remaining', v_limit - (v_current_usage + v_minutes_used),
    'is_over_limit', (v_current_usage + v_minutes_used) >= v_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SIMPLIFY USER PROFILE VIEW (REMOVE SUBSCRIPTION COMPLEXITY)
-- =============================================================================

-- Drop the complex v_user_profile view and create a simple one
DROP VIEW IF EXISTS public.v_user_profile CASCADE;

CREATE VIEW public.v_user_profile AS
SELECT 
  p.id as user_id,
  p.id,
  p.email,
  p.full_name,
  p.max_assistants,
  p.max_minutes_monthly,
  p.current_usage_minutes,
  p.created_at,
  p.updated_at,
  -- Simple calculations for everyone (10 min limit)
  (10 - COALESCE(p.current_usage_minutes, 0)) as remaining_minutes,
  CASE 
    WHEN 10 > 0 THEN 
      ROUND((COALESCE(p.current_usage_minutes, 0)::numeric / 10::numeric) * 100, 2)
    ELSE 0
  END as usage_percentage,
  (COALESCE(p.current_usage_minutes, 0) >= 10) as is_over_limit
FROM profiles p;

-- Grant permissions
GRANT SELECT ON public.v_user_profile TO authenticated;
GRANT SELECT ON public.v_user_profile TO service_role;
GRANT SELECT ON public.v_user_profile TO anon;

-- =============================================================================
-- OPTIONAL: REMOVE SUBSCRIPTION_EVENTS TABLE (IF YOU DON'T NEED IT)
-- =============================================================================

-- Uncomment these lines if you want to completely remove subscription event tracking:
-- DROP TABLE IF EXISTS public.subscription_events CASCADE;

-- =============================================================================
-- MONTHLY USAGE RESET FUNCTION (SIMPLIFIED)
-- =============================================================================

-- Simple function to reset everyone's usage monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  users_reset INTEGER;
BEGIN
  -- Reset all users' monthly usage to 0
  UPDATE profiles
  SET current_usage_minutes = 0,
      updated_at = NOW()
  WHERE current_usage_minutes > 0;
  
  GET DIAGNOSTICS users_reset = ROW_COUNT;

  -- Re-enable all assistants that were disabled due to usage limits
  UPDATE user_assistants
  SET is_disabled = false,
      disabled_at = NULL,
      disabled_reason = NULL,
      assistant_state = 'active'
  WHERE disabled_reason = 'usage_limit_exceeded';

  RAISE NOTICE 'Reset usage for % users and re-enabled their assistants', users_reset;
  
  RETURN users_reset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.reset_monthly_usage() TO service_role;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check that all users have correct limits
SELECT 
  'All users have correct limits' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE max_minutes_monthly = 10) as users_with_10min,
  COUNT(*) FILTER (WHERE max_assistants = 3) as users_with_3assistants,
  COUNT(*) FILTER (WHERE subscription_type = 'free') as free_users,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active_users
FROM profiles;

-- Show current usage summary
SELECT 
  'Current usage summary' as status,
  AVG(current_usage_minutes) as avg_usage,
  MAX(current_usage_minutes) as max_usage,
  COUNT(*) FILTER (WHERE current_usage_minutes >= 10) as users_over_limit
FROM profiles;

COMMENT ON FUNCTION public.track_call_usage IS 
'Simplified usage tracking - everyone gets 10 minutes, no subscription complexity';

COMMENT ON FUNCTION public.reset_monthly_usage IS 
'Simple monthly reset function for all users (10 minute limit for everyone)';

COMMENT ON VIEW public.v_user_profile IS 
'Simplified user profile view - everyone has same 10min/3assistant limits';