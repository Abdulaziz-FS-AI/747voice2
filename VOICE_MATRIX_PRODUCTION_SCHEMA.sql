-- ===================================================================
-- VOICE MATRIX - PRODUCTION SAAS DATABASE SCHEMA
-- Complete schema for voice AI assistant SaaS platform
-- Includes: Tables, Triggers, Functions, Policies, Indexes, Security
-- ===================================================================

-- Set search path and begin transaction for atomic deployment
BEGIN;
SET search_path = public;

-- Enable required extensions (safe execution)
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EXCEPTION WHEN OTHERS THEN
    -- Extensions might already exist or require superuser, continue anyway
    NULL;
END $$;

-- ===================================================================
-- 1. CORE USER PROFILES TABLE
-- ===================================================================
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Subscription Management
  subscription_type text NOT NULL DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'inactive')),
  billing_cycle_start timestamp with time zone DEFAULT now(),
  billing_cycle_end timestamp with time zone DEFAULT (now() + interval '1 month'),
  
  -- Payment Provider Integration
  stripe_customer_id text,
  stripe_subscription_id text,
  paypal_customer_id text,
  paypal_subscription_id text,
  paypal_payer_id text,
  payment_method_type text NOT NULL DEFAULT 'none' CHECK (payment_method_type IN ('none', 'paypal', 'card')),
  
  -- Usage Tracking
  current_usage_minutes numeric NOT NULL DEFAULT 0,
  max_minutes_monthly integer NOT NULL DEFAULT 10,
  max_assistants integer NOT NULL DEFAULT 3,
  usage_reset_date date DEFAULT CURRENT_DATE,
  
  -- User Experience
  onboarding_completed boolean NOT NULL DEFAULT false,
  setup_completed boolean NOT NULL DEFAULT false,
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ===================================================================
-- 2. TEMPLATES SYSTEM
-- ===================================================================
DROP TABLE IF EXISTS public.templates CASCADE;
CREATE TABLE public.templates (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  personality text NOT NULL,
  industry text NOT NULL DEFAULT 'general',
  model text DEFAULT 'gpt-4o-mini',
  provider text DEFAULT 'openai',
  default_questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- ===================================================================
-- 3. USER ASSISTANTS - CORE FUNCTIONALITY
-- ===================================================================
DROP TABLE IF EXISTS public.user_assistants CASCADE;
CREATE TABLE public.user_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  vapi_assistant_id text UNIQUE,
  template_id text,
  name text NOT NULL,
  personality text DEFAULT 'professional',
  call_objective text,
  client_messages text[],
  structured_questions jsonb DEFAULT '[]'::jsonb,
  model text DEFAULT 'gpt-4o-mini',
  provider text DEFAULT 'openai',
  voice text DEFAULT 'rachel',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- New schema columns (matches TypeScript types)
  config jsonb DEFAULT '{}'::jsonb,
  is_disabled boolean DEFAULT false,
  disabled_at timestamp with time zone,
  disabled_reason text,
  assistant_state text DEFAULT 'active' CHECK (assistant_state IN ('active', 'disabled_usage', 'disabled_payment', 'deleted')),
  original_vapi_config jsonb,
  
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL
);

-- ===================================================================
-- 4. STRUCTURED QUESTIONS FOR DATA COLLECTION
-- ===================================================================
DROP TABLE IF EXISTS public.structured_questions CASCADE;
CREATE TABLE public.structured_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  form_title text NOT NULL,
  question_text text NOT NULL,
  structured_name text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('string', 'number', 'boolean')),
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  
  CONSTRAINT structured_questions_pkey PRIMARY KEY (id),
  CONSTRAINT structured_questions_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- ===================================================================
-- 5. PHONE NUMBER MANAGEMENT
-- ===================================================================
DROP TABLE IF EXISTS public.user_phone_numbers CASCADE;
CREATE TABLE public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  vapi_phone_number_id text UNIQUE,
  number text NOT NULL,
  name text,
  friendly_name text NOT NULL, -- This was missing and causing schema cache errors!
  assigned_assistant_id uuid,
  is_active boolean DEFAULT true,
  provider text DEFAULT 'twilio',
  vapi_credential_id text,
  webhook_url text,
  twilio_account_sid text,
  twilio_auth_token text,
  assigned_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL
);

-- ===================================================================
-- 6. CALL LOGS & TRACKING
-- ===================================================================
DROP TABLE IF EXISTS public.call_logs CASCADE;
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  user_id uuid, -- Will be set by trigger
  duration_seconds integer DEFAULT 0,
  cost numeric(10,4),
  caller_number text,
  status text DEFAULT 'completed',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  transcript text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  success_evaluation text,
  summary text,
  
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- ===================================================================
-- 7. ANALYTICS & REPORTING
-- ===================================================================
DROP TABLE IF EXISTS public.call_analytics CASCADE;
CREATE TABLE public.call_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  assistant_id uuid,
  date date NOT NULL,
  total_calls integer DEFAULT 0,
  successful_calls integer DEFAULT 0,
  failed_calls integer DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  total_cost_cents integer DEFAULT 0,
  average_call_duration numeric DEFAULT 0,
  success_rate numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT call_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_user_date_unique UNIQUE (user_id, date)
);

-- ===================================================================
-- 8. SUBSCRIPTION & PAYMENT SYSTEM
-- ===================================================================
DROP TABLE IF EXISTS public.subscription_events CASCADE;
CREATE TABLE public.subscription_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'upgraded', 'downgraded', 'cancelled', 'renewed', 'payment_failed', 
    'usage_limit_exceeded', 'monthly_reset', 'usage_warning', 
    'payment_method_updated', 'subscription_paused', 'subscription_resumed', 'refund_processed'
  )),
  from_plan text,
  to_plan text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.payment_history CASCADE;
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  transaction_id text NOT NULL,
  payment_provider text NOT NULL CHECK (payment_provider IN ('paypal', 'stripe')),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_method text,
  description text,
  invoice_number text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT payment_history_pkey PRIMARY KEY (id),
  CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.invoices CASCADE;
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  transaction_id text,
  amount numeric(10,2) NOT NULL,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'void')),
  due_date timestamp with time zone,
  paid_date timestamp with time zone,
  pdf_url text,
  line_items jsonb DEFAULT '[]'::jsonb,
  billing_details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ===================================================================
-- 9. SYSTEM ADMINISTRATION & MONITORING
-- ===================================================================
DROP TABLE IF EXISTS public.rate_limits CASCADE;
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.usage_alerts CASCADE;
CREATE TABLE public.usage_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  threshold_value numeric NOT NULL,
  current_value numeric NOT NULL,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT usage_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT usage_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.vapi_sync_queue CASCADE;
CREATE TABLE public.vapi_sync_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  vapi_assistant_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('disable', 'enable', 'delete', 'update')),
  reason text NOT NULL,
  priority integer NOT NULL DEFAULT 5,
  retry_count integer NOT NULL DEFAULT 0,
  error text,
  processed_at timestamp with time zone,
  last_retry_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT vapi_sync_queue_pkey PRIMARY KEY (id),
  CONSTRAINT vapi_sync_queue_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS public.paypal_webhook_events CASCADE;
CREATE TABLE public.paypal_webhook_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  summary text,
  processed boolean NOT NULL DEFAULT false,
  raw_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at timestamp with time zone,
  
  CONSTRAINT paypal_webhook_events_pkey PRIMARY KEY (id)
);

DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS public.error_logs CASCADE;
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  error_id text NOT NULL UNIQUE,
  user_id uuid,
  error_name text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  user_agent text,
  url text,
  timestamp timestamp with time zone NOT NULL,
  resolved boolean DEFAULT false,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT error_logs_pkey PRIMARY KEY (id),
  CONSTRAINT error_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ===================================================================
-- 10. PERFORMANCE INDEXES (CRITICAL FOR SAAS PERFORMANCE)
-- ===================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON profiles(subscription_type);
CREATE INDEX IF NOT EXISTS idx_profiles_usage_reset_date ON profiles(usage_reset_date);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);

-- User assistants indexes (most queried table)
CREATE INDEX IF NOT EXISTS idx_user_assistants_user_id ON user_assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_vapi_id ON user_assistants(vapi_assistant_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_template_id ON user_assistants(template_id);
CREATE INDEX IF NOT EXISTS idx_user_assistants_created_at ON user_assistants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_assistants_state ON user_assistants(assistant_state);
CREATE INDEX IF NOT EXISTS idx_user_assistants_disabled ON user_assistants(is_disabled);
CREATE INDEX IF NOT EXISTS idx_user_assistants_user_active ON user_assistants(user_id, is_disabled, assistant_state);

-- Call logs indexes (heavy analytics queries)
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_created ON call_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_analytics ON call_logs(user_id, assistant_id, created_at);

-- Phone numbers indexes
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_vapi_id ON user_phone_numbers(vapi_phone_number_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_assistant_id ON user_phone_numbers(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_active ON user_phone_numbers(user_id, is_active);

-- Analytics indexes (dashboard performance)
CREATE INDEX IF NOT EXISTS idx_call_analytics_user_date ON call_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_call_analytics_assistant_date ON call_analytics(assistant_id, date DESC);

-- Structured questions indexes
CREATE INDEX IF NOT EXISTS idx_structured_questions_assistant_id ON structured_questions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_structured_questions_order ON structured_questions(assistant_id, order_index);

-- Payment & subscription indexes (billing queries)
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- System indexes (monitoring & admin)
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_vapi_sync_queue_priority ON vapi_sync_queue(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_vapi_sync_unprocessed ON vapi_sync_queue(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at);

-- ===================================================================
-- 11. ESSENTIAL SAAS FUNCTIONS
-- ===================================================================

-- Function to safely get user profile with usage calculations
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    email text,
    current_usage_minutes numeric,
    max_minutes_monthly integer,
    max_assistants integer,
    assistant_count bigint,
    can_create_assistant boolean,
    can_make_calls boolean,
    subscription_type text,
    subscription_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.current_usage_minutes,
        p.max_minutes_monthly,
        p.max_assistants,
        COALESCE(a.assistant_count, 0) as assistant_count,
        (COALESCE(a.assistant_count, 0) < p.max_assistants) as can_create_assistant,
        (p.current_usage_minutes < p.max_minutes_monthly) as can_make_calls,
        p.subscription_type,
        p.subscription_status
    FROM profiles p
    LEFT JOIN (
        SELECT user_id, COUNT(*) as assistant_count
        FROM user_assistants 
        WHERE user_id = user_uuid AND is_disabled = false
        GROUP BY user_id
    ) a ON p.id = a.user_id
    WHERE p.id = user_uuid;
END;
$$;

-- Function to create profile with proper SaaS defaults
CREATE OR REPLACE FUNCTION ensure_user_profile(user_uuid uuid, user_email text, user_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id FROM profiles WHERE id = user_uuid;
    
    -- Create if doesn't exist
    IF profile_id IS NULL THEN
        INSERT INTO profiles (
            id, email, full_name, current_usage_minutes, max_minutes_monthly,
            max_assistants, usage_reset_date, onboarding_completed, setup_completed,
            subscription_type, subscription_status, billing_cycle_start, billing_cycle_end
        ) VALUES (
            user_uuid, user_email, COALESCE(user_name, split_part(user_email, '@', 1)),
            0, 10, 3, CURRENT_DATE, false, false, 'free', 'active',
            now(), (now() + interval '1 month')
        ) RETURNING id INTO profile_id;
        
        -- Log the profile creation
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
        VALUES (user_uuid, 'profile_created', 'profile', profile_id::text, 
                jsonb_build_object('subscription_type', 'free', 'max_assistants', 3, 'max_minutes_monthly', 10));
        
        RAISE NOTICE 'Created new profile for user: %', user_uuid;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- Function to reset monthly usage (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reset_count integer;
BEGIN
    -- Reset usage for users whose reset date has passed
    UPDATE profiles 
    SET 
        current_usage_minutes = 0,
        usage_reset_date = usage_reset_date + interval '1 month',
        updated_at = now()
    WHERE usage_reset_date <= CURRENT_DATE;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    -- Log reset events
    INSERT INTO subscription_events (user_id, event_type, metadata)
    SELECT id, 'monthly_reset', jsonb_build_object('reset_date', CURRENT_DATE)
    FROM profiles 
    WHERE usage_reset_date = CURRENT_DATE;
    
    RAISE NOTICE 'Reset monthly usage for % users', reset_count;
    RETURN reset_count;
END;
$$;

-- Function to calculate user analytics
CREATE OR REPLACE FUNCTION update_call_analytics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update call analytics for the target date
    INSERT INTO call_analytics (
        user_id, assistant_id, date, total_calls, successful_calls, 
        failed_calls, total_duration_minutes, total_cost_cents, 
        average_call_duration, success_rate
    )
    SELECT 
        cl.user_id,
        cl.assistant_id,
        target_date,
        COUNT(*),
        COUNT(*) FILTER (WHERE cl.status = 'completed'),
        COUNT(*) FILTER (WHERE cl.status IN ('failed', 'cancelled')),
        SUM(CEIL(cl.duration_seconds::numeric / 60)),
        SUM(ROUND(cl.cost * 100)),
        AVG(cl.duration_seconds),
        (COUNT(*) FILTER (WHERE cl.status = 'completed')::numeric / COUNT(*) * 100)
    FROM call_logs cl
    WHERE DATE(cl.created_at) = target_date
    AND cl.user_id IS NOT NULL
    GROUP BY cl.user_id, cl.assistant_id
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        failed_calls = EXCLUDED.failed_calls,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        total_cost_cents = EXCLUDED.total_cost_cents,
        average_call_duration = EXCLUDED.average_call_duration,
        success_rate = EXCLUDED.success_rate,
        updated_at = now();
        
    RAISE NOTICE 'Updated call analytics for date: %', target_date;
END;
$$;

-- ===================================================================
-- 12. CRITICAL SAAS TRIGGERS
-- ===================================================================

-- Usage tracking trigger (ESSENTIAL for billing)
CREATE OR REPLACE FUNCTION update_user_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
    call_minutes numeric;
    new_usage numeric;
    max_minutes integer;
BEGIN
    -- Get user ID from assistant
    SELECT ua.user_id INTO user_uuid
    FROM user_assistants ua
    WHERE ua.id = NEW.assistant_id;
    
    IF user_uuid IS NULL THEN
        RAISE WARNING 'Could not find user for assistant: %', NEW.assistant_id;
        RETURN NEW;
    END IF;
    
    -- Calculate minutes (round up)
    call_minutes := CEIL(COALESCE(NEW.duration_seconds, 0)::numeric / 60);
    
    -- Update user usage and get new totals
    UPDATE profiles 
    SET 
        current_usage_minutes = current_usage_minutes + call_minutes,
        updated_at = now()
    WHERE id = user_uuid
    RETURNING current_usage_minutes, max_minutes_monthly INTO new_usage, max_minutes;
    
    -- Set user_id in the call log for easier querying
    NEW.user_id := user_uuid;
    
    -- Check if user exceeded limit and disable assistants
    IF new_usage >= max_minutes THEN
        UPDATE user_assistants 
        SET 
            is_disabled = true,
            disabled_at = now(),
            disabled_reason = 'usage_limit_exceeded',
            assistant_state = 'disabled_usage'
        WHERE user_id = user_uuid AND is_disabled = false;
        
        -- Log the limit exceeded event
        INSERT INTO subscription_events (user_id, event_type, metadata)
        VALUES (user_uuid, 'usage_limit_exceeded', 
                jsonb_build_object('usage_minutes', new_usage, 'limit_minutes', max_minutes));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the usage trigger
DROP TRIGGER IF EXISTS update_usage_on_call_log ON call_logs;
CREATE TRIGGER update_usage_on_call_log
    BEFORE INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage();

-- Audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log important changes to profiles
    IF TG_TABLE_NAME = 'profiles' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (NEW.id, TG_OP::text, 'profile', NEW.id::text, 
                CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
                row_to_json(NEW)::jsonb);
    END IF;
    
    -- Log assistant changes
    IF TG_TABLE_NAME = 'user_assistants' THEN
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
        VALUES (NEW.user_id, TG_OP::text, 'assistant', NEW.id::text,
                CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
                row_to_json(NEW)::jsonb);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create audit triggers
DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_assistants_changes ON user_assistants;
CREATE TRIGGER audit_assistants_changes
    AFTER INSERT OR UPDATE OR DELETE ON user_assistants
    FOR EACH ROW
    EXECUTE FUNCTION audit_sensitive_changes();

-- ===================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES - ENTERPRISE GRADE
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE structured_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapi_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE paypal_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create comprehensive RLS policies
CREATE POLICY "profiles_user_access" ON profiles
    FOR ALL USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "assistants_user_access" ON user_assistants
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "questions_user_access" ON structured_questions
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_assistants WHERE id = structured_questions.assistant_id) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "phone_numbers_user_access" ON user_phone_numbers
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "call_logs_user_access" ON call_logs
    FOR ALL USING (
        auth.uid() = user_id OR
        auth.uid() IN (SELECT user_id FROM user_assistants WHERE id = call_logs.assistant_id) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "analytics_user_access" ON call_analytics
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "subscription_events_user_access" ON subscription_events
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "payment_history_user_access" ON payment_history
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "invoices_user_access" ON invoices
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "usage_alerts_user_access" ON usage_alerts
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "vapi_sync_user_access" ON vapi_sync_queue
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM user_assistants WHERE id = vapi_sync_queue.assistant_id) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "audit_logs_user_access" ON audit_logs
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Service role only policies
CREATE POLICY "error_logs_service_only" ON error_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "rate_limits_service_only" ON rate_limits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "paypal_webhooks_service_only" ON paypal_webhook_events
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Templates - readable by all authenticated users
CREATE POLICY "templates_read_all" ON templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_service_manage" ON templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===================================================================
-- 14. GRANT COMPREHENSIVE PERMISSIONS
-- ===================================================================

-- Grant schema access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO service_role;
GRANT EXECUTE ON FUNCTION update_call_analytics(date) TO service_role;

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- ===================================================================
-- 15. SAMPLE DATA FOR TESTING (OPTIONAL)
-- ===================================================================

-- Insert sample templates
INSERT INTO templates (id, name, description, personality, industry, model, default_questions) VALUES
('general-assistant', 'General Assistant', 'A helpful general-purpose assistant', 'professional', 'general', 'gpt-4o-mini', '[]'::jsonb),
('sales-rep', 'Sales Representative', 'Professional sales assistant for lead qualification', 'professional', 'sales', 'gpt-4o-mini', 
 '[{"question": "What is your company name?", "type": "string", "required": true}]'::jsonb),
('customer-support', 'Customer Support', 'Friendly customer service assistant', 'friendly', 'support', 'gpt-4o-mini', 
 '[{"question": "What product do you need help with?", "type": "string", "required": true}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- 16. FINAL VERIFICATION & CLEANUP
-- ===================================================================

-- Commit the transaction
COMMIT;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Final verification queries
SELECT 'PRODUCTION_SCHEMA_DEPLOYED' as status, 
       COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'user_assistants', 'structured_questions', 'user_phone_numbers',
    'call_logs', 'call_analytics', 'templates', 'subscription_events',
    'payment_history', 'invoices', 'rate_limits', 'usage_alerts', 
    'vapi_sync_queue', 'paypal_webhook_events', 'audit_logs', 'error_logs'
);

SELECT 'INDEXES_CREATED' as status, COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

SELECT 'FUNCTIONS_CREATED' as status, COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_profile_safe', 'ensure_user_profile', 'reset_monthly_usage', 'update_call_analytics');

SELECT 'RLS_POLICIES_CREATED' as status, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

-- Test basic functionality
DO $$
BEGIN
    PERFORM COUNT(*) FROM profiles LIMIT 1;
    PERFORM COUNT(*) FROM user_assistants LIMIT 1;
    PERFORM COUNT(*) FROM user_phone_numbers LIMIT 1;
    PERFORM COUNT(*) FROM templates LIMIT 1;
    RAISE NOTICE '✅ ALL TABLES ACCESSIBLE - VOICE MATRIX SAAS SCHEMA DEPLOYED SUCCESSFULLY!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ SCHEMA DEPLOYMENT ERROR: %', SQLERRM;
END
$$;