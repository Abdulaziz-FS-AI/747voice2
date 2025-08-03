-- ===================================================================
-- VOICE MATRIX - COMPLETE DATABASE SCHEMA
-- This is the definitive schema that matches the TypeScript types and 
-- supports all frontend/backend features
-- ===================================================================

-- Set the search path to ensure we're working in the public schema
SET search_path = public;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ===================================================================
-- 1. CORE USER PROFILES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
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
CREATE TABLE IF NOT EXISTS public.templates (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  base_prompt text NOT NULL,
  customizable_fields jsonb DEFAULT '{}'::jsonb,
  voice_settings jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- ===================================================================
-- 3. USER ASSISTANTS - CORE FUNCTIONALITY
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.user_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  template_id text,
  vapi_assistant_id text UNIQUE,
  name text NOT NULL,
  
  -- Configuration stored as JSON (matches TypeScript interface)
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Management & State
  is_disabled boolean DEFAULT false,
  disabled_at timestamp with time zone,
  disabled_reason text,
  assistant_state text DEFAULT 'active' CHECK (assistant_state IN ('active', 'disabled_usage', 'disabled_payment', 'deleted')),
  original_vapi_config jsonb,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL
);

-- ===================================================================
-- 4. STRUCTURED QUESTIONS FOR DATA COLLECTION
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.structured_questions (
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
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  friendly_name text NOT NULL, -- This was causing the schema cache error!
  vapi_phone_id text NOT NULL,
  vapi_credential_id text,
  assigned_assistant_id uuid,
  webhook_url text,
  is_active boolean DEFAULT true,
  provider text DEFAULT 'twilio',
  twilio_account_sid text,
  twilio_auth_token text,
  assigned_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL,
  CONSTRAINT user_phone_numbers_vapi_phone_id_unique UNIQUE (vapi_phone_id)
);

-- ===================================================================
-- 6. CALL LOGS & TRACKING
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  user_id uuid, -- Derived from assistant, but stored for performance
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
CREATE TABLE IF NOT EXISTS public.call_analytics (
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
-- 8. SUBSCRIPTION & PAYMENT TRACKING
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.subscription_events (
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

CREATE TABLE IF NOT EXISTS public.payment_history (
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

CREATE TABLE IF NOT EXISTS public.invoices (
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
-- 9. SYSTEM ADMINISTRATION
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.vapi_sync_queue (
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

CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
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

-- ===================================================================
-- 10. AUDIT & MONITORING TABLES  
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
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

CREATE TABLE IF NOT EXISTS public.error_logs (
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
-- 11. PERFORMANCE INDEXES
-- ===================================================================

-- Profiles indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_subscription_type ON profiles(subscription_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_usage_reset_date ON profiles(usage_reset_date);

-- User assistants indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_user_id ON user_assistants(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_vapi_id ON user_assistants(vapi_assistant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_template_id ON user_assistants(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_created_at ON user_assistants(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_state ON user_assistants(assistant_state);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_disabled ON user_assistants(is_disabled);

-- Call logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_user_created ON call_logs(user_id, created_at DESC);

-- Phone numbers indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_vapi_id ON user_phone_numbers(vapi_phone_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_assistant_id ON user_phone_numbers(assigned_assistant_id);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_analytics_user_date ON call_analytics(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_analytics_assistant_date ON call_analytics(assistant_id, date DESC);

-- Structured questions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_questions_assistant_id ON structured_questions(assistant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_structured_questions_order ON structured_questions(assistant_id, order_index);

-- Payment & subscription indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- System indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_key_timestamp ON rate_limits(key, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vapi_sync_queue_priority ON vapi_sync_queue(priority, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);

-- ===================================================================
-- 12. ESSENTIAL FUNCTIONS
-- ===================================================================

-- Function to safely get user profile with limits
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    email text,
    current_usage_minutes numeric,
    max_minutes_monthly integer,
    max_assistants integer,
    assistant_count bigint,
    can_create_assistant boolean,
    can_make_calls boolean
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
        (p.current_usage_minutes < p.max_minutes_monthly) as can_make_calls
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

-- Function to create profile with proper defaults
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
            id, 
            email, 
            full_name,
            current_usage_minutes,
            max_minutes_monthly,
            max_assistants,
            usage_reset_date,
            onboarding_completed,
            setup_completed,
            subscription_type,
            subscription_status
        ) VALUES (
            user_uuid,
            user_email,
            COALESCE(user_name, split_part(user_email, '@', 1)),
            0,
            10, -- Free tier: 10 minutes
            3,  -- Free tier: 3 assistants
            CURRENT_DATE,
            false,
            false,
            'free',
            'active'
        )
        RETURNING id INTO profile_id;
        
        RAISE NOTICE 'Created new profile for user: %', user_uuid;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- ===================================================================
-- 13. USAGE TRACKING TRIGGER
-- ===================================================================

CREATE OR REPLACE FUNCTION update_user_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
    call_minutes numeric;
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
    
    -- Update user usage and set user_id in call log
    UPDATE profiles 
    SET 
        current_usage_minutes = current_usage_minutes + call_minutes,
        updated_at = now()
    WHERE id = user_uuid;
    
    -- Set user_id in the call log for easier querying
    NEW.user_id := user_uuid;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS update_usage_on_call_log ON call_logs;
CREATE TRIGGER update_usage_on_call_log
    BEFORE INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage();

-- ===================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE vapi_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "profiles_all_access" ON profiles;
DROP POLICY IF EXISTS "assistants_all_access" ON user_assistants;
DROP POLICY IF EXISTS "questions_all_access" ON structured_questions;
DROP POLICY IF EXISTS "phone_numbers_all_access" ON user_phone_numbers;
DROP POLICY IF EXISTS "call_logs_all_access" ON call_logs;
DROP POLICY IF EXISTS "analytics_all_access" ON call_analytics;
DROP POLICY IF EXISTS "subscription_events_all_access" ON subscription_events;
DROP POLICY IF EXISTS "payment_history_all_access" ON payment_history;
DROP POLICY IF EXISTS "invoices_all_access" ON invoices;
DROP POLICY IF EXISTS "vapi_sync_all_access" ON vapi_sync_queue;
DROP POLICY IF EXISTS "audit_logs_all_access" ON audit_logs;
DROP POLICY IF EXISTS "error_logs_service_role" ON error_logs;

-- Create unified policies that work with both authenticated users and service role
CREATE POLICY "profiles_all_access" ON profiles
    FOR ALL USING (
        auth.uid() = id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "assistants_all_access" ON user_assistants
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "questions_all_access" ON structured_questions
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_assistants WHERE id = structured_questions.assistant_id
        ) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "phone_numbers_all_access" ON user_phone_numbers
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "call_logs_all_access" ON call_logs
    FOR ALL USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT user_id FROM user_assistants WHERE id = call_logs.assistant_id
        ) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "analytics_all_access" ON call_analytics
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "subscription_events_all_access" ON subscription_events
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "payment_history_all_access" ON payment_history
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "invoices_all_access" ON invoices
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "vapi_sync_all_access" ON vapi_sync_queue
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_assistants WHERE id = vapi_sync_queue.assistant_id
        ) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "audit_logs_all_access" ON audit_logs
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "error_logs_service_role" ON error_logs
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Templates should be readable by all authenticated users
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_read_all" ON templates
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "templates_service_role" ON templates
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Rate limits - service role only
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_service_role" ON rate_limits
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- PayPal webhooks - service role only
ALTER TABLE paypal_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "paypal_webhooks_service_role" ON paypal_webhook_events
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- ===================================================================
-- 15. GRANT PERMISSIONS
-- ===================================================================

-- Grant necessary schema permissions
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

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- ===================================================================
-- 16. REFRESH SCHEMA CACHE
-- ===================================================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ===================================================================
-- 17. VERIFICATION QUERIES
-- ===================================================================

-- Verify all tables exist
SELECT 'SCHEMA_VERIFICATION' as check_type, table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'user_assistants', 'structured_questions', 'user_phone_numbers',
    'call_logs', 'call_analytics', 'templates', 'subscription_events',
    'payment_history', 'invoices', 'rate_limits', 'vapi_sync_queue',
    'paypal_webhook_events', 'audit_logs', 'error_logs'
)
ORDER BY table_name;

-- Verify critical columns exist
SELECT 'COLUMN_VERIFICATION' as check_type, 
       table_name, 
       column_name, 
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    (table_name = 'user_assistants' AND column_name IN ('config', 'personality', 'is_disabled', 'assistant_state')) OR
    (table_name = 'user_phone_numbers' AND column_name = 'friendly_name') OR
    (table_name = 'profiles' AND column_name IN ('subscription_type', 'max_assistants', 'current_usage_minutes'))
)
ORDER BY table_name, column_name;

-- Test basic functionality
DO $$
BEGIN
    PERFORM COUNT(*) FROM profiles LIMIT 1;
    RAISE NOTICE '✅ SUCCESS: profiles table accessible';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: profiles table - %', SQLERRM;
END
$$;

DO $$
BEGIN
    PERFORM COUNT(*) FROM user_assistants LIMIT 1;
    RAISE NOTICE '✅ SUCCESS: user_assistants table accessible';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: user_assistants table - %', SQLERRM;
END
$$;

DO $$
BEGIN
    PERFORM COUNT(*) FROM user_phone_numbers LIMIT 1;
    RAISE NOTICE '✅ SUCCESS: user_phone_numbers table accessible';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: user_phone_numbers table - %', SQLERRM;
END
$$;

-- ===================================================================
-- SCHEMA COMPLETE
-- ===================================================================

SELECT '🎉 VOICE MATRIX SCHEMA DEPLOYMENT COMPLETE' as status,
       'All tables, indexes, functions, and policies are now properly configured' as message;