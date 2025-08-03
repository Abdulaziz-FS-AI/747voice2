-- ===================================================================
-- VOICE MATRIX - FINAL WORKING SCHEMA
-- This version ensures the public schema exists and sets it properly
-- ===================================================================

-- Create public schema if it doesn't exist and set search path
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

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
  subscription_type text NOT NULL DEFAULT 'free',
  subscription_status text NOT NULL DEFAULT 'active',
  billing_cycle_start timestamp with time zone DEFAULT now(),
  billing_cycle_end timestamp with time zone DEFAULT (now() + interval '1 month'),
  
  -- Payment Provider Integration
  stripe_customer_id text,
  stripe_subscription_id text,
  paypal_customer_id text,
  paypal_subscription_id text,
  paypal_payer_id text,
  payment_method_type text NOT NULL DEFAULT 'none',
  
  -- Usage Tracking
  current_usage_minutes numeric NOT NULL DEFAULT 0,
  max_minutes_monthly integer NOT NULL DEFAULT 10,
  max_assistants integer NOT NULL DEFAULT 3,
  usage_reset_date date DEFAULT CURRENT_DATE,
  
  -- User Experience
  onboarding_completed boolean NOT NULL DEFAULT false,
  setup_completed boolean NOT NULL DEFAULT false,
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Add check constraints separately to avoid issues
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_type_check 
  CHECK (subscription_type IN ('free', 'pro'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check 
  CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'inactive'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_payment_method_type_check 
  CHECK (payment_method_type IN ('none', 'paypal', 'card'));

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
  vapi_assistant_id text,
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
  assistant_state text DEFAULT 'active',
  original_vapi_config jsonb,
  
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL
);

-- Add constraints separately
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_assistant_state_check 
  CHECK (assistant_state IN ('active', 'disabled_usage', 'disabled_payment', 'deleted'));

-- Create unique index on vapi_assistant_id (allowing nulls)
CREATE UNIQUE INDEX user_assistants_vapi_assistant_id_unique 
  ON public.user_assistants (vapi_assistant_id) WHERE vapi_assistant_id IS NOT NULL;

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
  data_type text NOT NULL,
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  
  CONSTRAINT structured_questions_pkey PRIMARY KEY (id),
  CONSTRAINT structured_questions_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  CONSTRAINT structured_questions_data_type_check CHECK (data_type IN ('string', 'number', 'boolean'))
);

-- ===================================================================
-- 5. PHONE NUMBER MANAGEMENT
-- ===================================================================
DROP TABLE IF EXISTS public.user_phone_numbers CASCADE;
CREATE TABLE public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  vapi_phone_number_id text,
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

-- Create unique index on vapi_phone_number_id (allowing nulls)
CREATE UNIQUE INDEX user_phone_numbers_vapi_phone_number_id_unique 
  ON public.user_phone_numbers (vapi_phone_number_id) WHERE vapi_phone_number_id IS NOT NULL;

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
  event_type text NOT NULL,
  from_plan text,
  to_plan text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscription_events_event_type_check CHECK (event_type IN (
    'upgraded', 'downgraded', 'cancelled', 'renewed', 'payment_failed', 
    'usage_limit_exceeded', 'monthly_reset', 'usage_warning', 
    'payment_method_updated', 'subscription_paused', 'subscription_resumed', 'refund_processed'
  ))
);

-- ===================================================================
-- 9. SYSTEM TABLES (SIMPLIFIED)
-- ===================================================================
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ===================================================================
-- 10. PERFORMANCE INDEXES
-- ===================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_subscription_type ON public.profiles(subscription_type);
CREATE INDEX idx_profiles_usage_reset_date ON public.profiles(usage_reset_date);

-- User assistants indexes (most queried table)
CREATE INDEX idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX idx_user_assistants_template_id ON public.user_assistants(template_id);
CREATE INDEX idx_user_assistants_created_at ON public.user_assistants(created_at DESC);
CREATE INDEX idx_user_assistants_state ON public.user_assistants(assistant_state);
CREATE INDEX idx_user_assistants_disabled ON public.user_assistants(is_disabled);

-- Call logs indexes
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);

-- Phone numbers indexes
CREATE INDEX idx_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_assistant_id ON public.user_phone_numbers(assigned_assistant_id);

-- Structured questions indexes
CREATE INDEX idx_structured_questions_assistant_id ON public.structured_questions(assistant_id);
CREATE INDEX idx_structured_questions_order ON public.structured_questions(assistant_id, order_index);

-- Analytics indexes
CREATE INDEX idx_call_analytics_user_date ON public.call_analytics(user_id, date DESC);

-- ===================================================================
-- 11. ESSENTIAL SAAS FUNCTIONS
-- ===================================================================

-- Function to create profile with proper SaaS defaults
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_uuid uuid, user_email text, user_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id FROM public.profiles WHERE id = user_uuid;
    
    -- Create if doesn't exist
    IF profile_id IS NULL THEN
        INSERT INTO public.profiles (
            id, email, full_name, current_usage_minutes, max_minutes_monthly,
            max_assistants, usage_reset_date, onboarding_completed, setup_completed,
            subscription_type, subscription_status
        ) VALUES (
            user_uuid, user_email, COALESCE(user_name, split_part(user_email, '@', 1)),
            0, 10, 3, CURRENT_DATE, false, false, 'free', 'active'
        ) RETURNING id INTO profile_id;
        
        RAISE NOTICE 'Created new profile for user: %', user_uuid;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- ===================================================================
-- 12. USAGE TRACKING TRIGGER
-- ===================================================================

-- Usage tracking trigger (ESSENTIAL for billing)
CREATE OR REPLACE FUNCTION public.update_user_usage()
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
    FROM public.user_assistants ua
    WHERE ua.id = NEW.assistant_id;
    
    IF user_uuid IS NULL THEN
        RAISE WARNING 'Could not find user for assistant: %', NEW.assistant_id;
        RETURN NEW;
    END IF;
    
    -- Calculate minutes (round up)
    call_minutes := CEIL(COALESCE(NEW.duration_seconds, 0)::numeric / 60);
    
    -- Update user usage and get new totals
    UPDATE public.profiles 
    SET 
        current_usage_minutes = current_usage_minutes + call_minutes,
        updated_at = now()
    WHERE id = user_uuid
    RETURNING current_usage_minutes, max_minutes_monthly INTO new_usage, max_minutes;
    
    -- Set user_id in the call log for easier querying
    NEW.user_id := user_uuid;
    
    -- Check if user exceeded limit and disable assistants
    IF new_usage >= max_minutes THEN
        UPDATE public.user_assistants 
        SET 
            is_disabled = true,
            disabled_at = now(),
            disabled_reason = 'usage_limit_exceeded',
            assistant_state = 'disabled_usage'
        WHERE user_id = user_uuid AND is_disabled = false;
        
        -- Log the limit exceeded event
        INSERT INTO public.subscription_events (user_id, event_type, metadata)
        VALUES (user_uuid, 'usage_limit_exceeded', 
                jsonb_build_object('usage_minutes', new_usage, 'limit_minutes', max_minutes));
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the usage trigger
DROP TRIGGER IF EXISTS update_usage_on_call_log ON public.call_logs;
CREATE TRIGGER update_usage_on_call_log
    BEFORE INSERT ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_usage();

-- ===================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "profiles_user_access" ON public.profiles
    FOR ALL USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "assistants_user_access" ON public.user_assistants
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "questions_user_access" ON public.structured_questions
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.user_assistants WHERE id = structured_questions.assistant_id) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "phone_numbers_user_access" ON public.user_phone_numbers
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "call_logs_user_access" ON public.call_logs
    FOR ALL USING (
        auth.uid() = user_id OR
        auth.uid() IN (SELECT user_id FROM public.user_assistants WHERE id = call_logs.assistant_id) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

CREATE POLICY "analytics_user_access" ON public.call_analytics
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "subscription_events_user_access" ON public.subscription_events
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "audit_logs_user_access" ON public.audit_logs
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Templates - readable by all authenticated users
CREATE POLICY "templates_read_all" ON public.templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_service_manage" ON public.templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ===================================================================
-- 14. SAMPLE DATA
-- ===================================================================

-- Insert sample templates
INSERT INTO public.templates (id, name, description, personality, industry, model, default_questions) VALUES
('general-assistant', 'General Assistant', 'A helpful general-purpose assistant', 'professional', 'general', 'gpt-4o-mini', '[]'::jsonb),
('sales-rep', 'Sales Representative', 'Professional sales assistant for lead qualification', 'professional', 'sales', 'gpt-4o-mini', 
 '[{"question": "What is your company name?", "type": "string", "required": true}]'::jsonb),
('customer-support', 'Customer Support', 'Friendly customer service assistant', 'friendly', 'support', 'gpt-4o-mini', 
 '[{"question": "What product do you need help with?", "type": "string", "required": true}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- 15. FINAL VERIFICATION
-- ===================================================================

-- Test basic functionality
DO $$
BEGIN
    PERFORM COUNT(*) FROM public.profiles LIMIT 1;
    PERFORM COUNT(*) FROM public.user_assistants LIMIT 1;
    PERFORM COUNT(*) FROM public.user_phone_numbers LIMIT 1;
    PERFORM COUNT(*) FROM public.templates LIMIT 1;
    RAISE NOTICE '✅ VOICE MATRIX SCHEMA DEPLOYED SUCCESSFULLY!';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '❌ SCHEMA ERROR: %', SQLERRM;
END
$$;

SELECT 'DEPLOYMENT_COMPLETE' as status, 
       'Voice Matrix SaaS schema ready for production' as message;