-- Voice Matrix Unified Database Schema
-- This replaces all previous migration files with a clean, unified schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.call_analytics CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.structured_questions CASCADE;
DROP TABLE IF EXISTS public.user_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.user_assistants CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create templates table
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  base_prompt text NOT NULL,
  customizable_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  voice_settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- Create user_assistants table
CREATE TABLE public.user_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  template_id uuid,
  vapi_assistant_id text NOT NULL UNIQUE,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL,
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create structured_questions table
CREATE TABLE public.structured_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  form_title text NOT NULL,
  question_text text NOT NULL,
  structured_name text NOT NULL,
  data_type text NOT NULL CHECK (data_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text])),
  is_required boolean DEFAULT false,
  order_index integer NOT NULL,
  CONSTRAINT structured_questions_pkey PRIMARY KEY (id),
  CONSTRAINT structured_questions_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- Create user_phone_numbers table
CREATE TABLE public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  phone_number text NOT NULL,
  friendly_name text NOT NULL,
  vapi_phone_id text NOT NULL UNIQUE,
  vapi_credential_id text,
  assigned_assistant_id uuid,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  provider character varying DEFAULT 'vapi'::character varying,
  twilio_account_sid text,
  twilio_auth_token text,
  assigned_at timestamp with time zone,
  notes text,
  CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL
);

-- Create call_logs table
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  duration_seconds integer DEFAULT 0,
  cost numeric,
  caller_number text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  transcript text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  success_evaluation text,
  summary text,
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- Create call_analytics table
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
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL,
  CONSTRAINT call_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create rate_limits table for security
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id)
);

-- Create indexes for performance
CREATE INDEX idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX idx_user_assistants_vapi_id ON public.user_assistants(vapi_assistant_id);
CREATE INDEX idx_structured_questions_assistant_id ON public.structured_questions(assistant_id);
CREATE INDEX idx_user_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX idx_user_phone_numbers_vapi_phone_id ON public.user_phone_numbers(vapi_phone_id);
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at);
CREATE INDEX idx_call_analytics_user_id ON public.call_analytics(user_id);
CREATE INDEX idx_call_analytics_date ON public.call_analytics(date);
CREATE INDEX idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX idx_rate_limits_timestamp ON public.rate_limits(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_assistants_updated_at
  BEFORE UPDATE ON public.user_assistants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_phone_numbers_updated_at
  BEFORE UPDATE ON public.user_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER call_analytics_updated_at
  BEFORE UPDATE ON public.call_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();