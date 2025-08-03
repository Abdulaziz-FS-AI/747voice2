-- Remove subscription tiers and implement simple limits
-- 10 minutes of calls and 3 assistants per user

-- Update profiles table to remove subscription fields and set simple limits
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS subscription_type,
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS billing_cycle_start,
DROP COLUMN IF EXISTS billing_cycle_end,
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id;

-- Update column names and defaults for simple limits
ALTER TABLE public.profiles 
ALTER COLUMN max_minutes_monthly SET DEFAULT 10,
ALTER COLUMN max_assistants SET DEFAULT 3;

-- Update existing users to have the new limits
UPDATE public.profiles 
SET max_minutes_monthly = 10, 
    max_assistants = 3;

-- Remove subscription-related tables
DROP TABLE IF EXISTS public.subscription_events CASCADE;
DROP TABLE IF EXISTS public.vapi_sync_queue CASCADE;

-- Remove subscription-related fields from user_assistants
ALTER TABLE public.user_assistants
DROP COLUMN IF EXISTS is_disabled,
DROP COLUMN IF EXISTS disabled_at,
DROP COLUMN IF EXISTS disabled_reason,
DROP COLUMN IF EXISTS original_vapi_config,
DROP COLUMN IF EXISTS assistant_state;

-- Update the profile creation trigger for simple limits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    10,  -- 10 minutes limit
    3,   -- 3 assistants limit
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove subscription-related indexes
DROP INDEX IF EXISTS idx_profiles_subscription_type;
DROP INDEX IF EXISTS idx_subscription_events_user_id;
DROP INDEX IF EXISTS idx_subscription_events_created_at;
DROP INDEX IF EXISTS idx_vapi_sync_queue_processed;
DROP INDEX IF EXISTS idx_user_assistants_disabled;

-- Create new indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_profiles_usage_minutes ON public.profiles(current_usage_minutes);
CREATE INDEX IF NOT EXISTS idx_profiles_max_assistants ON public.profiles(max_assistants);