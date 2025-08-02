-- Remove minute tracking and limits from the system
-- This migration removes all minute-based restrictions and tracking

-- 1. Drop the usage tracking view first (depends on minute columns)
DROP VIEW IF EXISTS public.v_user_profile CASCADE;

-- 2. Drop usage tracking functions
DROP FUNCTION IF EXISTS public.track_call_usage(UUID, INTEGER, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.auto_track_usage_on_call() CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_monthly_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_profile_by_assistant(UUID) CASCADE;

-- 3. Drop triggers related to usage tracking
DROP TRIGGER IF EXISTS trigger_track_usage_on_call ON public.call_logs;
DROP TRIGGER IF EXISTS trigger_track_usage_on_call_update ON public.call_logs;

-- 4. Remove minute-related columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS current_usage_minutes,
DROP COLUMN IF EXISTS max_minutes_monthly,
DROP COLUMN IF EXISTS billing_cycle_start,
DROP COLUMN IF EXISTS billing_cycle_end;

-- 5. Remove usage-related event types from subscription_events
-- First, delete existing usage-related events
DELETE FROM public.subscription_events 
WHERE event_type IN ('usage_limit_exceeded', 'monthly_reset', 'usage_warning', 'usage_tracked');

-- Then update the constraint to remove these event types
ALTER TABLE public.subscription_events 
DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events 
ADD CONSTRAINT subscription_events_event_type_check 
CHECK (event_type IN (
  'upgraded', 'downgraded', 'cancelled', 'renewed', 
  'payment_failed', 'payment_method_updated', 'subscription_paused',
  'subscription_resumed', 'refund_processed'
));

-- 6. Remove usage-based assistant disabling
UPDATE public.user_assistants 
SET is_disabled = false,
    disabled_at = NULL,
    disabled_reason = NULL,
    assistant_state = 'active'
WHERE disabled_reason = 'usage_limit_exceeded';

-- 7. Create simplified v_user_profile view without minute tracking
CREATE VIEW public.v_user_profile AS
SELECT 
  p.id as user_id,  -- Make.com compatibility
  p.id,
  p.email,
  p.full_name,
  p.subscription_type,
  p.subscription_status,
  p.max_assistants,
  p.created_at,
  p.updated_at,
  p.setup_completed
FROM profiles p;

-- Grant permissions
GRANT SELECT ON public.v_user_profile TO authenticated;
GRANT SELECT ON public.v_user_profile TO service_role;
GRANT SELECT ON public.v_user_profile TO anon;

-- 8. Update profile creation trigger to remove minute defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    subscription_type,
    subscription_status,
    max_assistants,
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
    CASE 
      WHEN NEW.raw_user_meta_data->>'subscription_type' = 'pro' THEN 10
      ELSE 1
    END,
    COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Clean up indexes related to usage
DROP INDEX IF EXISTS idx_profiles_usage;

-- 10. Update the checkSubscriptionLimits to only check assistant count
-- This will need to be updated in the application code

COMMENT ON VIEW public.v_user_profile IS 
'Simplified user profile view without minute tracking for Make.com compatibility';

-- Log the migration
INSERT INTO subscription_events (user_id, event_type, metadata)
SELECT 
  id,
  'upgraded',
  jsonb_build_object(
    'message', 'Minute limits removed - unlimited usage enabled',
    'migration', '012_remove_minute_limits'
  )
FROM profiles
WHERE id IN (SELECT DISTINCT id FROM profiles LIMIT 1);