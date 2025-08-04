-- CRITICAL FIXES FOR VOICE MATRIX DATABASE
-- Run these fixes to resolve major bugs preventing the app from working

-- =============================================================================
-- FIX #1: Create missing subscription_events table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_type 
ON public.subscription_events(user_id, event_type);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL TO service_role USING (true);

-- Grant permissions
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;

-- =============================================================================
-- FIX #2: Add missing columns to call_logs table
-- =============================================================================
-- Add vapi_call_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'vapi_call_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN vapi_call_id text UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_call_logs_vapi_call_id ON public.call_logs(vapi_call_id);
    END IF;
END $$;

-- Add duration field (in addition to duration_seconds) for consistency
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'duration'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN duration integer;
    END IF;
END $$;

-- Add ended_at field if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'ended_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN ended_at timestamp with time zone;
    END IF;
END $$;

-- Add cost_cents field if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'cost_cents'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.call_logs ADD COLUMN cost_cents integer DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- FIX #3: Fix the update_call_log_user_id function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_call_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user_id from assistant
  SELECT ua.user_id INTO NEW.user_id
  FROM public.user_assistants ua
  WHERE ua.id = NEW.assistant_id;
  
  -- If assistant not found, log warning but don't fail
  IF NEW.user_id IS NULL THEN
    RAISE WARNING 'Could not find user for assistant: %', NEW.assistant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX #4: Fix the track_call_usage function to handle errors gracefully
-- =============================================================================
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

  -- Log the event (with error handling)
  BEGIN
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
        'total_usage', COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used,
        'limit', v_profile.max_minutes_monthly
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to log usage event: %', SQLERRM;
  END;

  -- Check if over limit
  IF (COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used) >= v_profile.max_minutes_monthly THEN
    -- Log limit exceeded (with error handling)
    BEGIN
      INSERT INTO subscription_events (
        user_id,
        event_type,
        metadata
      ) VALUES (
        v_user_id,
        'usage_limit_exceeded',
        jsonb_build_object(
          'usage', COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used,
          'limit', v_profile.max_minutes_monthly,
          'overage', (COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used) - v_profile.max_minutes_monthly
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to log limit exceeded event: %', SQLERRM;
    END;

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
    'total_usage', COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used,
    'limit', v_profile.max_minutes_monthly,
    'remaining', v_profile.max_minutes_monthly - (COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used),
    'is_over_limit', (COALESCE(v_profile.current_usage_minutes, 0) + v_minutes_used) >= v_profile.max_minutes_monthly
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX #5: Fix the auto_track_usage_on_call function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_track_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Only process if we have a duration
  IF NEW.duration_seconds IS NOT NULL AND NEW.duration_seconds > 0 THEN
    -- Call the tracking function
    BEGIN
      v_result := public.track_call_usage(
        NEW.assistant_id,
        NEW.duration_seconds,
        NEW.id
      );
      
      -- Log result if tracking failed
      IF NOT (v_result->>'success')::boolean THEN
        RAISE WARNING 'Failed to track usage for call %: %', NEW.id, v_result->>'error';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Exception in usage tracking for call %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FIX #6: Add proper foreign key constraints with ON DELETE actions
-- =============================================================================

-- Fix call_logs foreign key constraint
ALTER TABLE public.call_logs DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_assistant_id_fkey 
  FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE;

-- Fix other foreign key constraints if they exist
ALTER TABLE public.structured_questions DROP CONSTRAINT IF EXISTS structured_questions_assistant_id_fkey;
ALTER TABLE public.structured_questions ADD CONSTRAINT structured_questions_assistant_id_fkey 
  FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE;

ALTER TABLE public.user_phone_numbers DROP CONSTRAINT IF EXISTS user_phone_numbers_assigned_assistant_id_fkey;
ALTER TABLE public.user_phone_numbers ADD CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey 
  FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL;

-- =============================================================================
-- FIX #7: Recreate triggers safely
-- =============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_call_log_user_id ON public.call_logs;
DROP TRIGGER IF EXISTS trigger_track_usage_on_call ON public.call_logs;
DROP TRIGGER IF EXISTS trigger_track_usage_on_call_update ON public.call_logs;

-- Create trigger to populate user_id
CREATE TRIGGER trigger_update_call_log_user_id
  BEFORE INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_log_user_id();

-- Create triggers for usage tracking
CREATE TRIGGER trigger_track_usage_on_call
  AFTER INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_track_usage_on_call();

CREATE TRIGGER trigger_track_usage_on_call_update
  AFTER UPDATE OF duration_seconds ON public.call_logs
  FOR EACH ROW
  WHEN (OLD.duration_seconds IS DISTINCT FROM NEW.duration_seconds)
  EXECUTE FUNCTION public.auto_track_usage_on_call();

-- =============================================================================
-- FIX #8: Add subscription fields to profiles if missing
-- =============================================================================
DO $$ 
BEGIN
    -- Add subscription_type if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'subscription_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_type text NOT NULL DEFAULT 'free'::text 
        CHECK (subscription_type = ANY (ARRAY['free'::text, 'pro'::text]));
    END IF;

    -- Add subscription_status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'subscription_status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_status text NOT NULL DEFAULT 'active'::text 
        CHECK (subscription_status = ANY (ARRAY['active'::text, 'cancelled'::text, 'past_due'::text, 'inactive'::text]));
    END IF;

    -- Add limit_enforced_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'limit_enforced_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN limit_enforced_at timestamp with time zone;
    END IF;
END $$;

-- =============================================================================
-- FIX #9: Grant proper permissions
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.track_call_usage(UUID, INTEGER, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_call_usage(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_call_log_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_track_usage_on_call() TO service_role;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify subscription_events table exists
SELECT 'subscription_events table exists' as status 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_events');

-- Verify triggers are created
SELECT 'Triggers created' as status, count(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name LIKE '%call_log%' OR trigger_name LIKE '%usage%';

-- Verify foreign key constraints
SELECT 'Foreign key constraints' as status, count(*) as fk_count
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_schema = 'public';

COMMENT ON TABLE public.subscription_events IS 'Critical fix: Added missing subscription_events table for usage tracking';