-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'inactive')),
ADD COLUMN IF NOT EXISTS current_usage_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_minutes_monthly integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_assistants integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_cycle_start timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS billing_cycle_end timestamptz DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Create subscription events table for tracking plan changes
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'upgraded', 'downgraded', 'cancelled', 'renewed', 
    'payment_failed', 'usage_limit_exceeded', 'monthly_reset',
    'usage_warning', 'payment_method_updated', 'subscription_paused',
    'subscription_resumed', 'refund_processed'
  )),
  from_plan text,
  to_plan text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create VAPI sync queue table for managing external API changes
CREATE TABLE IF NOT EXISTS public.vapi_sync_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistant_id UUID NOT NULL REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  vapi_assistant_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('disable', 'enable', 'delete', 'update')),
  reason text NOT NULL,
  priority integer DEFAULT 5,
  retry_count integer DEFAULT 0,
  error text,
  processed_at timestamptz,
  last_retry_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add missing fields to user_assistants table
ALTER TABLE public.user_assistants
ADD COLUMN IF NOT EXISTS is_disabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
ADD COLUMN IF NOT EXISTS disabled_reason text,
ADD COLUMN IF NOT EXISTS original_vapi_config jsonb,
ADD COLUMN IF NOT EXISTS assistant_state text DEFAULT 'active' CHECK (assistant_state IN ('active', 'disabled_usage', 'disabled_payment', 'deleted'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON public.subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vapi_sync_queue_processed ON public.vapi_sync_queue(processed_at);
CREATE INDEX IF NOT EXISTS idx_user_assistants_disabled ON public.user_assistants(is_disabled);

-- Add RLS policies
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage vapi sync queue" ON public.vapi_sync_queue
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Update the profile creation trigger to set proper defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    subscription_type,
    subscription_status,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    billing_cycle_start,
    billing_cycle_end,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free',
    'active', 
    0,
    10,
    1,
    NOW(),
    NOW() + INTERVAL '30 days',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;