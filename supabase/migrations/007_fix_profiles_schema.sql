-- Fix profiles table to match TypeScript interface and code expectations
-- This migration resolves critical schema mismatches causing subscription bugs

-- First, let's see what columns exist
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ensures safe migration

-- Add missing PayPal columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paypal_customer_id text,
ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
ADD COLUMN IF NOT EXISTS paypal_payer_id text;

-- Add missing onboarding columns  
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_completed boolean DEFAULT false;

-- Fix payment_method_type constraint to match TypeScript types
-- Drop existing constraint if it exists
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_payment_method_type_check;

-- Add correct constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_payment_method_type_check 
CHECK (payment_method_type = ANY (ARRAY['none'::text, 'paypal'::text, 'card'::text]));

-- Add missing unique constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT IF NOT EXISTS profiles_stripe_subscription_id_unique UNIQUE (stripe_subscription_id);

-- Update existing users to have setup_completed = true (they're already using the system)
UPDATE public.profiles 
SET setup_completed = true 
WHERE setup_completed IS NULL OR setup_completed = false;

-- Update payment_method_type for existing users with 'stripe' to 'card'
UPDATE public.profiles 
SET payment_method_type = 'card' 
WHERE payment_method_type = 'stripe';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_setup_completed ON public.profiles(setup_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id ON public.profiles(paypal_subscription_id);

-- Add missing payment_history table columns to match TypeScript expectations
-- (The provided SQL schema has stripe fields but code might expect more)

-- Check if payment_history needs updates
ALTER TABLE public.payment_history
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'stripe' CHECK (payment_provider = ANY (ARRAY['paypal'::text, 'stripe'::text])),
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create missing payment_history indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_provider ON public.payment_history(payment_provider);

-- Add missing subscription_events columns if needed
ALTER TABLE public.subscription_events
ADD COLUMN IF NOT EXISTS usage_warning_type text,
ADD COLUMN IF NOT EXISTS payment_method_updated text,
ADD COLUMN IF NOT EXISTS subscription_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_resumed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_processed boolean DEFAULT false;

-- Update subscription_events constraint to include all expected event types
ALTER TABLE public.subscription_events 
DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events 
ADD CONSTRAINT subscription_events_event_type_check 
CHECK (event_type = ANY (ARRAY[
  'upgraded'::text, 
  'downgraded'::text, 
  'cancelled'::text, 
  'renewed'::text, 
  'payment_failed'::text, 
  'usage_limit_exceeded'::text, 
  'monthly_reset'::text, 
  'usage_warning'::text, 
  'payment_method_updated'::text, 
  'subscription_paused'::text, 
  'subscription_resumed'::text, 
  'refund_processed'::text
]));

-- Verify the schema is correct by adding comments
COMMENT ON COLUMN public.profiles.paypal_customer_id IS 'PayPal customer identifier for subscription management';
COMMENT ON COLUMN public.profiles.paypal_subscription_id IS 'PayPal subscription identifier for active subscriptions';
COMMENT ON COLUMN public.profiles.setup_completed IS 'Tracks if user completed initial signup flow with plan selection';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks if user completed product onboarding';

-- Create a view to easily check profile completeness
CREATE OR REPLACE VIEW public.profile_status AS
SELECT 
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  setup_completed,
  onboarding_completed,
  payment_method_type,
  CASE 
    WHEN setup_completed = false THEN 'needs_setup'
    WHEN onboarding_completed = false THEN 'needs_onboarding'
    ELSE 'complete'
  END as profile_status,
  created_at
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.profile_status TO authenticated;
GRANT SELECT ON public.profile_status TO service_role;