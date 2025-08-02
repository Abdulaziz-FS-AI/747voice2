-- COMPLETE SCHEMA FIX FOR VOICE MATRIX
-- Run this script in your Supabase SQL editor to fix all schema issues

-- Step 1: Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paypal_customer_id text,
ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
ADD COLUMN IF NOT EXISTS paypal_payer_id text,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;

-- Step 2: Fix payment_method_type constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_payment_method_type_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_payment_method_type_check 
CHECK (payment_method_type = ANY (ARRAY['none'::text, 'paypal'::text, 'card'::text]));

-- Step 3: Add unique constraint for Stripe subscription ID safely
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_stripe_subscription_id_unique' 
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);
    END IF;
END $$;

-- Step 4: Update existing data
UPDATE public.profiles 
SET setup_completed = true 
WHERE setup_completed IS NULL OR setup_completed = false;

UPDATE public.profiles 
SET onboarding_completed = false 
WHERE onboarding_completed IS NULL;

UPDATE public.profiles 
SET payment_method_type = 'card' 
WHERE payment_method_type = 'stripe';

-- Step 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_setup_completed ON public.profiles(setup_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id ON public.profiles(paypal_subscription_id);

-- Step 6: Update payment_history table
ALTER TABLE public.payment_history
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Add payment_provider constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payment_history_payment_provider_check' 
        AND table_name = 'payment_history'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.payment_history 
        ADD CONSTRAINT payment_history_payment_provider_check 
        CHECK (payment_provider = ANY (ARRAY['paypal'::text, 'stripe'::text]));
    END IF;
END $$;

-- Step 7: Create payment_history indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_provider ON public.payment_history(payment_provider);

-- Step 8: Update subscription_events table
ALTER TABLE public.subscription_events
ADD COLUMN IF NOT EXISTS usage_warning_type text,
ADD COLUMN IF NOT EXISTS payment_method_updated text,
ADD COLUMN IF NOT EXISTS subscription_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_resumed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_processed boolean DEFAULT false;

-- Update subscription_events constraint
ALTER TABLE public.subscription_events 
DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events 
ADD CONSTRAINT subscription_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'upgraded'::text, 'downgraded'::text, 'cancelled'::text, 'renewed'::text, 
  'payment_failed'::text, 'usage_limit_exceeded'::text, 'monthly_reset'::text, 
  'usage_warning'::text, 'payment_method_updated'::text, 'subscription_paused'::text, 
  'subscription_resumed'::text, 'refund_processed'::text
]));

-- Step 9: Create automatic profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, subscription_type, subscription_status,
    current_usage_minutes, max_minutes_monthly, max_assistants,
    billing_cycle_start, billing_cycle_end, payment_method_type,
    onboarding_completed, setup_completed, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free')::text,
    'active',
    0,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 100 ELSE 10 END,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 10 ELSE 1 END,
    NOW(),
    NOW() + INTERVAL '30 days',
    'none',
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, false),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 11: Grant permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Step 12: Create cleanup function for user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Step 13: Create profiles for existing auth users without profiles
INSERT INTO public.profiles (
  id, email, full_name, subscription_type, subscription_status,
  current_usage_minutes, max_minutes_monthly, max_assistants,
  billing_cycle_start, billing_cycle_end, payment_method_type,
  onboarding_completed, setup_completed, created_at, updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    CONCAT(au.raw_user_meta_data->>'first_name', ' ', au.raw_user_meta_data->>'last_name'),
    SPLIT_PART(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'subscription_type', 'free')::text,
  'active',
  0,
  CASE WHEN COALESCE(au.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 100 ELSE 10 END,
  CASE WHEN COALESCE(au.raw_user_meta_data->>'subscription_type', 'free') = 'pro' THEN 10 ELSE 1 END,
  NOW(),
  NOW() + INTERVAL '30 days',
  'none',
  false, -- onboarding_completed
  true,  -- setup_completed (mark existing users as complete)
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL -- Only for users without profiles
ON CONFLICT (id) DO NOTHING;

-- Step 14: Create helpful view
CREATE OR REPLACE VIEW public.profile_status AS
SELECT 
  id, email, full_name, subscription_type, subscription_status,
  setup_completed, onboarding_completed, payment_method_type,
  CASE 
    WHEN setup_completed = false THEN 'needs_setup'
    WHEN onboarding_completed = false THEN 'needs_onboarding'
    ELSE 'complete'
  END as profile_status,
  created_at
FROM public.profiles;

-- Step 15: Grant view permissions
GRANT SELECT ON public.profile_status TO authenticated;
GRANT SELECT ON public.profile_status TO service_role;

-- Step 16: Add helpful comments
COMMENT ON COLUMN public.profiles.paypal_customer_id IS 'PayPal customer identifier for subscription management';
COMMENT ON COLUMN public.profiles.paypal_subscription_id IS 'PayPal subscription identifier for active subscriptions';
COMMENT ON COLUMN public.profiles.setup_completed IS 'Tracks if user completed initial signup flow with plan selection';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks if user completed product onboarding';
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile record when new auth user is created';
COMMENT ON FUNCTION public.handle_user_delete() IS 'Cleans up profile record when auth user is deleted';

-- Final verification query
SELECT 
  'Schema Fix Complete!' as status,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN setup_completed = true THEN 1 END) as setup_complete,
  COUNT(CASE WHEN subscription_type = 'free' THEN 1 END) as free_users,
  COUNT(CASE WHEN subscription_type = 'pro' THEN 1 END) as pro_users
FROM public.profiles;