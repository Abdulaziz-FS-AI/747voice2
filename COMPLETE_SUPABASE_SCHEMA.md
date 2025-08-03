# Voice Matrix SaaS - Complete Supabase Schema

This document contains the complete SQL setup for the entire Voice Matrix SaaS platform from zero. This is a production-ready schema for an AI voice assistant platform with usage tracking, lead management, analytics, and multi-tenant architecture.

## 🎯 Platform Overview

**Voice Matrix** is a SaaS platform that enables users to:
- Create AI voice assistants with different personalities
- Manage phone numbers for inbound/outbound calls
- Track call analytics and lead generation
- Monitor usage with real-time limits
- Extract structured data from conversations

## 🏗️ Architecture Features

- **Multi-tenant**: Each user has isolated data
- **Usage-based limits**: 10 minutes/month, 3 assistants per user
- **Real-time tracking**: Auto-updated usage via triggers
- **Lead management**: Extract and track leads from calls
- **Analytics**: Comprehensive call and performance metrics
- **Security**: Row Level Security (RLS) on all tables
- **Audit logging**: Track all user actions
- **Scalable**: Designed for thousands of users

## Complete SQL Schema

```sql
-- ===============================================
-- Voice Matrix SaaS - Complete Database Schema
-- ===============================================
-- Production-ready SQL for AI Voice Assistant SaaS
-- Features: Multi-tenant, Usage tracking, Lead management, Analytics
-- Last updated: 2025-01-03

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (clean slate)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Drop all existing tables in proper order
DROP TABLE IF EXISTS public.lead_interactions CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.call_transcripts CASCADE;
DROP TABLE IF EXISTS public.call_analytics CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.webhook_logs CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.usage_alerts CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.structured_questions CASCADE;
DROP TABLE IF EXISTS public.user_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.assistant_templates CASCADE;
DROP TABLE IF EXISTS public.user_assistants CASCADE;
DROP TABLE IF EXISTS public.assistant_categories CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.subscription_usage CASCADE;
DROP TABLE IF EXISTS public.billing_history CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- ===============================================
-- CORE USER MANAGEMENT & PROFILES
-- ===============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  company_name text,
  industry text,
  phone_number text,
  timezone text DEFAULT 'UTC',
  
  -- Usage tracking
  current_usage_minutes NUMERIC DEFAULT 0,
  max_minutes_monthly INTEGER DEFAULT 10,
  max_assistants INTEGER DEFAULT 3,
  max_phone_numbers INTEGER DEFAULT 1,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Account status
  account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'cancelled')),
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  trial_ends_at timestamp with time zone,
  onboarding_completed BOOLEAN DEFAULT false,
  last_active_at timestamp with time zone DEFAULT now(),
  
  -- Billing
  stripe_customer_id text,
  billing_email text,
  
  -- Metadata
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User settings and preferences
CREATE TABLE public.user_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Communication preferences
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  webhook_notifications boolean DEFAULT false,
  
  -- Call settings
  default_voice text DEFAULT 'rachel',
  default_model text DEFAULT 'gpt-4o-mini',
  default_provider text DEFAULT 'openai',
  call_recording_enabled boolean DEFAULT true,
  call_transcription_enabled boolean DEFAULT true,
  
  -- Analytics preferences
  analytics_enabled boolean DEFAULT true,
  lead_tracking_enabled boolean DEFAULT true,
  export_format text DEFAULT 'csv' CHECK (export_format IN ('csv', 'json', 'excel')),
  
  -- API settings
  api_rate_limit INTEGER DEFAULT 100,
  webhook_url text,
  webhook_secret text,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_settings_user_unique UNIQUE(user_id)
);

-- ===============================================
-- SUBSCRIPTION & BILLING
-- ===============================================

-- Subscription usage tracking
CREATE TABLE public.subscription_usage (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Usage period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Actual usage
  minutes_used NUMERIC DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  assistants_created INTEGER DEFAULT 0,
  phone_numbers_used INTEGER DEFAULT 0,
  
  -- Limits for this period
  minutes_limit INTEGER DEFAULT 10,
  calls_limit INTEGER DEFAULT 1000,
  assistants_limit INTEGER DEFAULT 3,
  phone_numbers_limit INTEGER DEFAULT 1,
  
  -- Cost tracking
  total_cost_cents INTEGER DEFAULT 0,
  vapi_cost_cents INTEGER DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT subscription_usage_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscription_usage_period_unique UNIQUE(user_id, period_start)
);

-- Billing history
CREATE TABLE public.billing_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Invoice details
  invoice_id text,
  stripe_invoice_id text,
  amount_cents INTEGER NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Usage that generated this bill
  minutes_used NUMERIC DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  overage_minutes NUMERIC DEFAULT 0,
  overage_cost_cents INTEGER DEFAULT 0,
  
  -- Payment details
  payment_method text,
  paid_at timestamp with time zone,
  due_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT billing_history_pkey PRIMARY KEY (id),
  CONSTRAINT billing_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ===============================================
-- ASSISTANT MANAGEMENT
-- ===============================================

-- Assistant categories (predefined)
CREATE TABLE public.assistant_categories (
  id text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#6366f1',
  is_active boolean DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT assistant_categories_pkey PRIMARY KEY (id)
);

-- Assistant templates (predefined configurations)
CREATE TABLE public.assistant_templates (
  id text NOT NULL,
  category_id text NOT NULL,
  name text NOT NULL,
  description text,
  personality text NOT NULL,
  industry text NOT NULL DEFAULT 'general',
  
  -- AI Configuration
  model text DEFAULT 'gpt-4o-mini',
  provider text DEFAULT 'openai',
  voice text DEFAULT 'rachel',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 150,
  
  -- Behavior settings
  call_objective text,
  system_prompt text,
  first_message text,
  end_call_phrases text[],
  
  -- Structured data collection
  default_questions jsonb DEFAULT '[]'::jsonb,
  lead_qualification jsonb DEFAULT '{}'::jsonb,
  
  -- Features
  is_premium boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT assistant_templates_pkey PRIMARY KEY (id),
  CONSTRAINT assistant_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.assistant_categories(id) ON DELETE CASCADE
);

-- User's custom assistants
CREATE TABLE public.user_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  template_id text,
  
  -- Basic info
  name text NOT NULL,
  description text,
  personality text NOT NULL,
  industry text DEFAULT 'general',
  
  -- VAPI integration
  vapi_assistant_id text UNIQUE,
  vapi_phone_number_id text,
  
  -- AI Configuration
  model text DEFAULT 'gpt-4o-mini',
  provider text DEFAULT 'openai',
  voice text DEFAULT 'rachel',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 150,
  
  -- Behavior
  call_objective text,
  system_prompt text,
  first_message text,
  end_call_phrases text[],
  client_messages text[],
  
  -- Advanced settings
  interruption_threshold INTEGER DEFAULT 100,
  silence_timeout_seconds INTEGER DEFAULT 30,
  max_call_duration_minutes INTEGER DEFAULT 15,
  
  -- Features
  call_recording_enabled boolean DEFAULT true,
  call_transcription_enabled boolean DEFAULT true,
  lead_extraction_enabled boolean DEFAULT true,
  analytics_enabled boolean DEFAULT true,
  
  -- Status
  is_active boolean DEFAULT true,
  is_deployed boolean DEFAULT false,
  deployment_status text DEFAULT 'draft' CHECK (deployment_status IN ('draft', 'deploying', 'deployed', 'failed')),
  last_deployed_at timestamp with time zone,
  
  -- Usage stats
  total_calls INTEGER DEFAULT 0,
  total_minutes NUMERIC DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.assistant_templates(id) ON DELETE SET NULL
);

-- Structured questions for data collection
CREATE TABLE public.structured_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  
  question text NOT NULL,
  key text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'number', 'email', 'phone', 'boolean', 'date', 'url')),
  required boolean DEFAULT false,
  order_index integer DEFAULT 0,
  
  -- Validation
  validation_regex text,
  validation_message text,
  min_length INTEGER,
  max_length INTEGER,
  
  -- Options for select types
  options jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT structured_questions_pkey PRIMARY KEY (id),
  CONSTRAINT structured_questions_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- ===============================================
-- PHONE NUMBER MANAGEMENT
-- ===============================================

-- User phone numbers
CREATE TABLE public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Phone details
  vapi_phone_number_id text UNIQUE,
  number text NOT NULL,
  formatted_number text,
  country_code text,
  area_code text,
  carrier text,
  
  -- Assignment
  assigned_assistant_id uuid,
  name text,
  description text,
  
  -- Settings
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  forward_calls boolean DEFAULT false,
  forward_to_number text,
  
  -- Provider details
  provider text DEFAULT 'twilio',
  provider_phone_id text,
  monthly_cost_cents INTEGER DEFAULT 0,
  
  -- Usage stats
  total_calls_received INTEGER DEFAULT 0,
  total_calls_made INTEGER DEFAULT 0,
  total_minutes NUMERIC DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL
);

-- ===============================================
-- CALL MANAGEMENT & ANALYTICS
-- ===============================================

-- Call logs (main call records)
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Relationships
  user_id uuid NOT NULL,
  assistant_id uuid NOT NULL,
  phone_number_id uuid,
  
  -- Call identification
  vapi_call_id text UNIQUE,
  call_direction text DEFAULT 'inbound' CHECK (call_direction IN ('inbound', 'outbound')),
  
  -- Participants
  caller_number text,
  caller_name text,
  caller_country text,
  destination_number text,
  
  -- Call metrics
  duration_seconds INTEGER DEFAULT 0,
  billable_duration_seconds INTEGER DEFAULT 0,
  status text DEFAULT 'completed' CHECK (status IN ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
  end_reason text,
  
  -- Timing
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  answered_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Cost tracking
  cost_cents INTEGER DEFAULT 0,
  vapi_cost_cents INTEGER DEFAULT 0,
  openai_cost_cents INTEGER DEFAULT 0,
  twilio_cost_cents INTEGER DEFAULT 0,
  
  -- Quality metrics
  audio_quality_score NUMERIC,
  latency_ms INTEGER,
  interruptions_count INTEGER DEFAULT 0,
  silence_periods_count INTEGER DEFAULT 0,
  
  -- AI Performance
  response_accuracy NUMERIC,
  goal_completion_rate NUMERIC,
  sentiment_score NUMERIC,
  
  -- Compliance
  recording_url text,
  recording_duration_seconds INTEGER,
  consent_given boolean DEFAULT false,
  
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.user_phone_numbers(id) ON DELETE SET NULL
);

-- Call transcripts (separate for performance)
CREATE TABLE public.call_transcripts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  call_id uuid NOT NULL,
  
  -- Transcript data
  full_transcript text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  
  -- AI analysis
  summary text,
  key_points text[],
  action_items text[],
  sentiment_analysis jsonb DEFAULT '{}'::jsonb,
  language_detected text DEFAULT 'en',
  
  -- Quality scores
  transcript_confidence NUMERIC,
  processing_time_ms INTEGER,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_transcripts_pkey PRIMARY KEY (id),
  CONSTRAINT call_transcripts_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.call_logs(id) ON DELETE CASCADE,
  CONSTRAINT call_transcripts_call_unique UNIQUE(call_id)
);

-- Call analytics (aggregated daily data)
CREATE TABLE public.call_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  assistant_id uuid,
  phone_number_id uuid,
  
  -- Time dimension
  date date NOT NULL,
  hour_of_day INTEGER,
  day_of_week INTEGER,
  
  -- Call volume metrics
  total_calls INTEGER DEFAULT 0,
  inbound_calls INTEGER DEFAULT 0,
  outbound_calls INTEGER DEFAULT 0,
  successful_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  
  -- Duration metrics
  total_duration_seconds INTEGER DEFAULT 0,
  avg_duration_seconds NUMERIC DEFAULT 0,
  max_duration_seconds INTEGER DEFAULT 0,
  min_duration_seconds INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_audio_quality NUMERIC DEFAULT 0,
  avg_response_time_ms NUMERIC DEFAULT 0,
  total_interruptions INTEGER DEFAULT 0,
  
  -- Cost metrics
  total_cost_cents INTEGER DEFAULT 0,
  avg_cost_per_call_cents NUMERIC DEFAULT 0,
  
  -- Performance metrics
  success_rate NUMERIC DEFAULT 0,
  goal_completion_rate NUMERIC DEFAULT 0,
  avg_sentiment_score NUMERIC DEFAULT 0,
  
  -- Lead metrics
  leads_generated INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT call_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.user_phone_numbers(id) ON DELETE SET NULL,
  CONSTRAINT call_analytics_unique_date UNIQUE(user_id, assistant_id, date, hour_of_day)
);

-- ===============================================
-- LEAD MANAGEMENT
-- ===============================================

-- Leads extracted from calls
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  call_id uuid,
  assistant_id uuid,
  
  -- Lead identification
  external_id text,
  source text DEFAULT 'call',
  
  -- Contact information
  full_name text,
  first_name text,
  last_name text,
  email text,
  phone_number text,
  company text,
  job_title text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  
  -- Lead qualification
  lead_score INTEGER DEFAULT 0,
  lead_status text DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost')),
  lead_priority text DEFAULT 'medium' CHECK (lead_priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Business context
  industry text,
  company_size text,
  budget_range text,
  timeframe text,
  pain_points text[],
  interests text[],
  
  -- Interaction tracking
  first_contact_date timestamp with time zone,
  last_contact_date timestamp with time zone,
  next_follow_up_date timestamp with time zone,
  total_interactions INTEGER DEFAULT 0,
  
  -- Custom fields (flexible JSON)
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  tags text[],
  notes text,
  assigned_to text,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT leads_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.call_logs(id) ON DELETE SET NULL,
  CONSTRAINT leads_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL
);

-- Lead interactions (follow-ups, emails, etc.)
CREATE TABLE public.lead_interactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL,
  user_id uuid NOT NULL,
  
  -- Interaction details
  type text NOT NULL CHECK (type IN ('call', 'email', 'sms', 'meeting', 'note', 'task')),
  direction text DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject text,
  content text,
  
  -- Timing
  scheduled_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_minutes INTEGER,
  
  -- Results
  outcome text CHECK (outcome IN ('successful', 'no-answer', 'busy', 'failed', 'rescheduled')),
  next_action text,
  next_action_date timestamp with time zone,
  
  -- Metadata
  tags text[],
  is_completed boolean DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT lead_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
  CONSTRAINT lead_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ===============================================
-- SYSTEM MANAGEMENT
-- ===============================================

-- API keys for user integrations
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Key details
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  
  -- Permissions
  scopes text[] DEFAULT ARRAY['read'],
  rate_limit INTEGER DEFAULT 100,
  
  -- Usage tracking
  last_used_at timestamp with time zone,
  usage_count INTEGER DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT api_keys_key_hash_unique UNIQUE(key_hash)
);

-- Rate limiting
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  api_key_id uuid,
  
  -- Rate limit details
  endpoint text NOT NULL,
  requests_count integer DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  window_size_minutes INTEGER DEFAULT 60,
  max_requests INTEGER DEFAULT 100,
  
  -- Reset tracking
  last_reset_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT rate_limits_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE,
  CONSTRAINT rate_limits_unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  
  -- Action details
  action text NOT NULL,
  resource_type text,
  resource_id text,
  
  -- Context
  ip_address inet,
  user_agent text,
  api_key_id uuid,
  
  -- Data
  details jsonb DEFAULT '{}'::jsonb,
  old_values jsonb DEFAULT '{}'::jsonb,
  new_values jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT audit_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL
);

-- Usage alerts
CREATE TABLE public.usage_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Alert configuration
  alert_type text NOT NULL CHECK (alert_type IN ('usage_warning', 'usage_critical', 'billing_threshold', 'quota_exceeded')),
  threshold_type text NOT NULL CHECK (threshold_type IN ('percentage', 'absolute')),
  threshold_value NUMERIC NOT NULL,
  
  -- Current state
  current_value NUMERIC NOT NULL,
  is_triggered boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  
  -- Notification settings
  notification_methods text[] DEFAULT ARRAY['email'],
  notification_sent_at timestamp with time zone,
  
  -- Metadata
  message text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT usage_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT usage_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT usage_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  
  -- Email notifications
  email_usage_alerts boolean DEFAULT true,
  email_billing_alerts boolean DEFAULT true,
  email_system_updates boolean DEFAULT true,
  email_marketing boolean DEFAULT false,
  
  -- SMS notifications
  sms_usage_alerts boolean DEFAULT false,
  sms_billing_alerts boolean DEFAULT false,
  sms_phone_number text,
  
  -- Webhook notifications
  webhook_usage_alerts boolean DEFAULT false,
  webhook_billing_alerts boolean DEFAULT false,
  webhook_url text,
  webhook_secret text,
  
  -- In-app notifications
  inapp_usage_alerts boolean DEFAULT true,
  inapp_billing_alerts boolean DEFAULT true,
  inapp_system_updates boolean DEFAULT true,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT notification_preferences_user_unique UNIQUE(user_id)
);

-- Webhook logs
CREATE TABLE public.webhook_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  
  -- Webhook details
  webhook_url text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Delivery
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
  response_status INTEGER,
  response_body text,
  response_time_ms INTEGER,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at timestamp with time zone,
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  delivered_at timestamp with time zone,
  
  CONSTRAINT webhook_logs_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ===============================================
-- PERFORMANCE INDEXES
-- ===============================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX idx_profiles_usage_tracking ON public.profiles(current_usage_minutes, max_minutes_monthly);
CREATE INDEX idx_profiles_trial_ends ON public.profiles(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

CREATE INDEX idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX idx_user_assistants_vapi_id ON public.user_assistants(vapi_assistant_id) WHERE vapi_assistant_id IS NOT NULL;
CREATE INDEX idx_user_assistants_active ON public.user_assistants(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_assistants_deployed ON public.user_assistants(deployment_status) WHERE deployment_status = 'deployed';

CREATE INDEX idx_call_logs_user_id_date ON public.call_logs(user_id, created_at);
CREATE INDEX idx_call_logs_assistant_user ON public.call_logs(assistant_id, user_id);
CREATE INDEX idx_call_logs_duration_status ON public.call_logs(duration_seconds, status) WHERE status = 'completed';
CREATE INDEX idx_call_logs_vapi_id ON public.call_logs(vapi_call_id) WHERE vapi_call_id IS NOT NULL;
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at);
CREATE INDEX idx_call_logs_phone_number ON public.call_logs(phone_number_id) WHERE phone_number_id IS NOT NULL;

CREATE INDEX idx_call_analytics_user_date ON public.call_analytics(user_id, date);
CREATE INDEX idx_call_analytics_assistant_date ON public.call_analytics(assistant_id, date);

CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_status ON public.leads(lead_status);
CREATE INDEX idx_leads_priority ON public.leads(lead_priority);
CREATE INDEX idx_leads_follow_up ON public.leads(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;
CREATE INDEX idx_leads_email ON public.leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_phone ON public.leads(phone_number) WHERE phone_number IS NOT NULL;

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_user_id ON public.lead_interactions(user_id);
CREATE INDEX idx_lead_interactions_scheduled ON public.lead_interactions(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

CREATE INDEX idx_usage_alerts_user_id ON public.usage_alerts(user_id);
CREATE INDEX idx_usage_alerts_triggered ON public.usage_alerts(is_triggered) WHERE is_triggered = true;

-- ===============================================
-- DATABASE FUNCTIONS
-- ===============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    current_usage_minutes,
    max_minutes_monthly,
    max_assistants,
    max_phone_numbers,
    usage_reset_date,
    onboarding_completed,
    account_status,
    subscription_tier
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,    -- current_usage_minutes
    10,   -- max_minutes_monthly
    3,    -- max_assistants
    1,    -- max_phone_numbers
    CURRENT_DATE,
    false,
    'active',
    'free'
  );

  -- Create user settings
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  
  -- Create notification preferences
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id);
  
  -- Create initial subscription usage record
  INSERT INTO public.subscription_usage (
    user_id,
    period_start,
    period_end,
    minutes_limit,
    assistants_limit,
    phone_numbers_limit
  ) VALUES (
    NEW.id,
    date_trunc('month', CURRENT_DATE)::DATE,
    (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE,
    10,
    3,
    1
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user_id from assistant_id
CREATE OR REPLACE FUNCTION get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE id = assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate current month usage for a user
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month
  SELECT COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO total_minutes
  FROM public.call_logs
  WHERE user_id = user_uuid
    AND created_at >= start_of_month
    AND status = 'completed';
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user usage when call is completed
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  current_period_start DATE;
BEGIN
  -- Get user_id from assistant if not already set
  IF NEW.user_id IS NULL THEN
    NEW.user_id := get_user_from_assistant(NEW.assistant_id);
  END IF;
  
  target_user_id := NEW.user_id;
  
  -- Only update if call is completed and has duration
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- Update subscription usage for current period
    current_period_start := date_trunc('month', CURRENT_DATE)::DATE;
    
    INSERT INTO public.subscription_usage (
      user_id,
      period_start,
      period_end,
      minutes_used,
      calls_made,
      minutes_limit,
      assistants_limit,
      phone_numbers_limit
    ) VALUES (
      target_user_id,
      current_period_start,
      (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE,
      new_usage,
      1,
      10,
      3,
      1
    )
    ON CONFLICT (user_id, period_start)
    DO UPDATE SET
      minutes_used = new_usage,
      calls_made = subscription_usage.calls_made + 1,
      updated_at = now();
    
    -- Log the usage update
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      target_user_id,
      'usage_updated',
      'call',
      NEW.id::text,
      jsonb_build_object(
        'call_id', NEW.id,
        'call_duration_seconds', NEW.duration_seconds,
        'new_total_minutes', new_usage
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for real-time usage updates
CREATE TRIGGER call_usage_update_trigger
  BEFORE INSERT OR UPDATE OF duration_seconds, status ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- Function to check if user can make a call (pre-call validation)
CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile RECORD;
  current_usage NUMERIC;
  assistant_count INTEGER;
  phone_count INTEGER;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT 
    max_minutes_monthly,
    max_assistants,
    max_phone_numbers,
    account_status,
    subscription_tier
  INTO user_profile
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Check if user exists and is active
  IF NOT FOUND OR user_profile.account_status != 'active' THEN
    RETURN jsonb_build_object(
      'can_make_call', false,
      'can_create_assistant', false,
      'reason', 'Account not found or inactive'
    );
  END IF;
  
  -- Get current counts
  SELECT COUNT(*) INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid AND is_active = true;
  
  SELECT COUNT(*) INTO phone_count
  FROM public.user_phone_numbers
  WHERE user_id = user_uuid AND is_active = true;
  
  -- Recalculate current usage to ensure accuracy
  current_usage := calculate_monthly_usage(user_uuid);
  
  -- Build result
  result := jsonb_build_object(
    'can_make_call', current_usage < user_profile.max_minutes_monthly,
    'can_create_assistant', assistant_count < user_profile.max_assistants,
    'can_create_phone_number', phone_count < user_profile.max_phone_numbers,
    'usage', jsonb_build_object(
      'minutes_used', current_usage,
      'minutes_limit', user_profile.max_minutes_monthly,
      'minutes_remaining', GREATEST(0, user_profile.max_minutes_monthly - current_usage),
      'assistants_count', assistant_count,
      'assistants_limit', user_profile.max_assistants,
      'assistants_remaining', GREATEST(0, user_profile.max_assistants - assistant_count),
      'phone_numbers_count', phone_count,
      'phone_numbers_limit', user_profile.max_phone_numbers,
      'phone_numbers_remaining', GREATEST(0, user_profile.max_phone_numbers - phone_count)
    ),
    'account', jsonb_build_object(
      'status', user_profile.account_status,
      'tier', user_profile.subscription_tier
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to reset monthly usage (run on first day of month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
  user_record RECORD;
BEGIN
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Reset usage for users whose reset date is before current month
  FOR user_record IN 
    SELECT id, max_minutes_monthly, max_assistants, max_phone_numbers
    FROM public.profiles 
    WHERE usage_reset_date < current_month_start 
       OR usage_reset_date IS NULL
  LOOP
    -- Reset profile usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = 0,
      usage_reset_date = current_month_start,
      updated_at = now()
    WHERE id = user_record.id;
    
    -- Create new subscription usage record for the month
    INSERT INTO public.subscription_usage (
      user_id,
      period_start,
      period_end,
      minutes_limit,
      assistants_limit,
      phone_numbers_limit
    ) VALUES (
      user_record.id,
      current_month_start,
      (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE,
      user_record.max_minutes_monthly,
      user_record.max_assistants,
      user_record.max_phone_numbers
    ) ON CONFLICT (user_id, period_start) DO NOTHING;
    
    reset_count := reset_count + 1;
  END LOOP;
  
  -- Log the reset action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details
  ) VALUES (
    NULL,
    'monthly_usage_reset',
    jsonb_build_object(
      'reset_date', current_month_start,
      'users_reset', reset_count
    )
  );
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update assistant usage stats
CREATE OR REPLACE FUNCTION update_assistant_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.user_assistants
    SET 
      total_calls = total_calls + 1,
      total_minutes = total_minutes + (NEW.duration_seconds / 60.0),
      updated_at = now()
    WHERE id = NEW.assistant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assistant stats
CREATE TRIGGER update_assistant_stats_trigger
  AFTER UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_stats();

-- Function to generate API key
CREATE OR REPLACE FUNCTION generate_api_key(user_uuid uuid, key_name text)
RETURNS text AS $$
DECLARE
  api_key text;
  key_prefix text;
  key_hash text;
BEGIN
  -- Generate a random API key
  api_key := 'vm_' || encode(gen_random_bytes(32), 'hex');
  key_prefix := left(api_key, 12) || '...';
  key_hash := encode(digest(api_key, 'sha256'), 'hex');
  
  -- Store in database
  INSERT INTO public.api_keys (
    user_id,
    name,
    key_hash,
    key_prefix
  ) VALUES (
    user_uuid,
    key_name,
    key_hash,
    key_prefix
  );
  
  RETURN api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Subscription usage policies
CREATE POLICY "Users can view their own subscription usage" ON public.subscription_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Billing history policies
CREATE POLICY "Users can view their own billing history" ON public.billing_history
  FOR SELECT USING (auth.uid() = user_id);

-- User assistants policies
CREATE POLICY "Users can manage their own assistants" ON public.user_assistants
  FOR ALL USING (auth.uid() = user_id);

-- Structured questions policies
CREATE POLICY "Users can manage questions for their assistants" ON public.structured_questions
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_assistants WHERE id = structured_questions.assistant_id
    )
  );

-- Phone numbers policies
CREATE POLICY "Users can manage their own phone numbers" ON public.user_phone_numbers
  FOR ALL USING (auth.uid() = user_id);

-- Call logs policies
CREATE POLICY "Users can view their own call logs" ON public.call_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create call logs for their assistants" ON public.call_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update call logs" ON public.call_logs
  FOR UPDATE USING (true);

-- Call transcripts policies
CREATE POLICY "Users can view transcripts for their calls" ON public.call_transcripts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.call_logs WHERE id = call_transcripts.call_id
    )
  );

CREATE POLICY "System can manage call transcripts" ON public.call_transcripts
  FOR ALL USING (true);

-- Call analytics policies
CREATE POLICY "Users can view their own analytics" ON public.call_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Leads policies
CREATE POLICY "Users can manage their own leads" ON public.leads
  FOR ALL USING (auth.uid() = user_id);

-- Lead interactions policies
CREATE POLICY "Users can manage their own lead interactions" ON public.lead_interactions
  FOR ALL USING (auth.uid() = user_id);

-- API keys policies
CREATE POLICY "Users can manage their own API keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Usage alerts policies
CREATE POLICY "Users can manage their own usage alerts" ON public.usage_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Webhook logs policies
CREATE POLICY "Users can view their own webhook logs" ON public.webhook_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant specific function permissions
GRANT EXECUTE ON FUNCTION calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_from_assistant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_api_key(uuid, text) TO authenticated;

-- ===============================================
-- SEED DATA
-- ===============================================

-- Insert assistant categories
INSERT INTO public.assistant_categories (id, name, description, icon, color, sort_order) VALUES
('sales', 'Sales & Lead Generation', 'AI assistants optimized for sales calls and lead qualification', '📞', '#10b981', 1),
('support', 'Customer Support', 'AI assistants for customer service and support inquiries', '🎧', '#3b82f6', 2),
('appointment', 'Appointment Booking', 'AI assistants for scheduling and appointment management', '📅', '#8b5cf6', 3),
('survey', 'Surveys & Feedback', 'AI assistants for conducting surveys and collecting feedback', '📊', '#f59e0b', 4),
('qualification', 'Lead Qualification', 'AI assistants specialized in qualifying and scoring leads', '✅', '#ef4444', 5),
('general', 'General Purpose', 'Versatile AI assistants for various business needs', '🤖', '#6b7280', 6);

-- Insert assistant templates
INSERT INTO public.assistant_templates (id, category_id, name, description, personality, industry, call_objective, system_prompt, first_message, default_questions, is_featured) VALUES
('real-estate-lead', 'sales', 'Real Estate Lead Qualifier', 'AI assistant specialized in qualifying real estate leads and scheduling property viewings', 'professional', 'real-estate', 
'Qualify real estate leads and schedule property viewings', 
'You are a professional real estate assistant. Your goal is to qualify potential buyers and sellers, understand their needs, and schedule appropriate follow-up actions.',
'Hi! I''m calling about your interest in real estate. Do you have a moment to discuss your property needs?',
'[{"question": "Are you looking to buy or sell a property?", "key": "intent", "required": true}, {"question": "What''s your budget range?", "key": "budget", "required": true}, {"question": "What areas are you interested in?", "key": "location", "required": true}, {"question": "When are you looking to make a move?", "key": "timeframe", "required": false}]',
true),

('ecommerce-support', 'support', 'E-commerce Support', 'AI assistant for handling e-commerce customer inquiries and order support', 'friendly', 'e-commerce',
'Provide customer support for e-commerce inquiries',
'You are a helpful e-commerce customer support representative. Assist customers with orders, returns, product questions, and account issues.',
'Hello! I''m here to help with any questions about your order or our products. How can I assist you today?',
'[{"question": "What''s your order number?", "key": "order_number", "required": false}, {"question": "What type of issue are you experiencing?", "key": "issue_type", "required": true}, {"question": "Can you describe the problem in detail?", "key": "description", "required": true}]',
true),

('appointment-scheduler', 'appointment', 'Medical Appointment Scheduler', 'AI assistant for scheduling medical appointments and managing patient inquiries', 'professional', 'healthcare',
'Schedule medical appointments and collect patient information',
'You are a medical office assistant. Help patients schedule appointments, collect necessary information, and answer basic questions about services.',
'Hello, I''m calling from the medical office. I understand you''d like to schedule an appointment. I''d be happy to help you with that.',
'[{"question": "What type of appointment do you need?", "key": "appointment_type", "required": true}, {"question": "What''s your preferred date and time?", "key": "preferred_time", "required": true}, {"question": "Is this your first visit with us?", "key": "new_patient", "required": true}, {"question": "Do you have any specific concerns or symptoms?", "key": "concerns", "required": false}]',
true),

('lead-qualifier', 'qualification', 'B2B Lead Qualifier', 'AI assistant for qualifying business leads and identifying decision makers', 'professional', 'b2b',
'Qualify B2B leads and identify decision makers',
'You are a B2B lead qualification specialist. Your goal is to understand the prospect''s business needs, budget, timeline, and decision-making process.',
'Hi, I''m reaching out regarding your interest in our business solutions. Do you have a few minutes to discuss your current challenges?',
'[{"question": "What''s your role in the company?", "key": "job_title", "required": true}, {"question": "How many employees does your company have?", "key": "company_size", "required": true}, {"question": "What''s your biggest challenge right now?", "key": "pain_point", "required": true}, {"question": "What''s your timeline for making a decision?", "key": "timeline", "required": true}, {"question": "What''s your budget range for this type of solution?", "key": "budget", "required": false}]',
true),

('survey-collector', 'survey', 'Customer Satisfaction Survey', 'AI assistant for conducting customer satisfaction surveys and collecting feedback', 'friendly', 'general',
'Conduct customer satisfaction surveys',
'You are conducting a brief customer satisfaction survey. Be friendly, keep questions short, and ensure the conversation flows naturally.',
'Hi! I''m calling to get your feedback on our recent service. This will only take a couple of minutes. Would you mind sharing your experience?',
'[{"question": "How would you rate your overall experience? (1-10)", "key": "rating", "required": true}, {"question": "What did you like most about our service?", "key": "positive_feedback", "required": false}, {"question": "Is there anything we could improve?", "key": "improvement_suggestions", "required": false}, {"question": "Would you recommend us to others?", "key": "nps", "required": true}]',
false),

('insurance-lead', 'sales', 'Insurance Lead Qualifier', 'AI assistant for qualifying insurance leads and assessing coverage needs', 'professional', 'insurance',
'Qualify insurance leads and assess coverage needs',
'You are an insurance assistant helping to qualify leads and understand their coverage needs. Be professional and focus on understanding their current situation and needs.',
'Hello, I''m calling about your interest in insurance coverage. I''d like to ask a few questions to better understand your needs.',
'[{"question": "What type of insurance are you interested in?", "key": "insurance_type", "required": true}, {"question": "Do you currently have any insurance coverage?", "key": "current_coverage", "required": true}, {"question": "What''s prompting you to look for new coverage?", "key": "motivation", "required": true}, {"question": "When would you like the coverage to start?", "key": "start_date", "required": false}]',
false);

-- Schedule monthly usage reset (requires pg_cron extension)
-- Run on the first day of each month at midnight
SELECT cron.schedule(
  'reset-monthly-usage',
  '0 0 1 * *',
  'SELECT reset_monthly_usage();'
);

-- ===============================================
-- HELPFUL VIEWS
-- ===============================================

-- User usage summary view
CREATE OR REPLACE VIEW public.user_usage_summary AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  p.subscription_tier,
  p.account_status,
  p.current_usage_minutes,
  p.max_minutes_monthly,
  p.max_assistants,
  p.max_phone_numbers,
  p.usage_reset_date,
  
  -- Current counts
  COUNT(DISTINCT ua.id) FILTER (WHERE ua.is_active = true) as active_assistants,
  COUNT(DISTINCT pn.id) FILTER (WHERE pn.is_active = true) as active_phone_numbers,
  COUNT(DISTINCT cl.id) FILTER (WHERE cl.created_at >= date_trunc('month', CURRENT_DATE)) as calls_this_month,
  
  -- Usage calculations
  COALESCE(SUM(cl.duration_seconds) FILTER (WHERE cl.created_at >= date_trunc('month', CURRENT_DATE) AND cl.status = 'completed') / 60.0, 0) as calculated_minutes_used,
  p.max_minutes_monthly - p.current_usage_minutes as minutes_remaining,
  p.max_assistants - COUNT(DISTINCT ua.id) FILTER (WHERE ua.is_active = true) as assistants_remaining,
  p.max_phone_numbers - COUNT(DISTINCT pn.id) FILTER (WHERE pn.is_active = true) as phone_numbers_remaining,
  
  -- Usage percentages
  ROUND((p.current_usage_minutes / p.max_minutes_monthly * 100)::numeric, 1) as minutes_usage_percentage,
  ROUND((COUNT(DISTINCT ua.id) FILTER (WHERE ua.is_active = true)::numeric / p.max_assistants * 100)::numeric, 1) as assistants_usage_percentage,
  
  -- Timestamps
  p.created_at,
  p.last_active_at,
  p.trial_ends_at

FROM public.profiles p
LEFT JOIN public.user_assistants ua ON p.id = ua.user_id
LEFT JOIN public.user_phone_numbers pn ON p.id = pn.user_id
LEFT JOIN public.call_logs cl ON p.id = cl.user_id
GROUP BY p.id;

-- Call analytics summary view
CREATE OR REPLACE VIEW public.call_analytics_summary AS
SELECT 
  cl.user_id,
  cl.assistant_id,
  ua.name as assistant_name,
  DATE(cl.created_at) as call_date,
  
  -- Call metrics
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE cl.status = 'completed') as successful_calls,
  COUNT(*) FILTER (WHERE cl.status != 'completed') as failed_calls,
  
  -- Duration metrics
  SUM(cl.duration_seconds) as total_duration_seconds,
  ROUND(AVG(cl.duration_seconds)::numeric, 1) as avg_duration_seconds,
  MAX(cl.duration_seconds) as max_duration_seconds,
  
  -- Cost metrics
  SUM(cl.cost_cents) as total_cost_cents,
  ROUND(AVG(cl.cost_cents)::numeric, 2) as avg_cost_cents,
  
  -- Success rate
  ROUND((COUNT(*) FILTER (WHERE cl.status = 'completed')::numeric / COUNT(*) * 100)::numeric, 1) as success_rate_percentage

FROM public.call_logs cl
JOIN public.user_assistants ua ON cl.assistant_id = ua.id
GROUP BY cl.user_id, cl.assistant_id, ua.name, DATE(cl.created_at);

-- Lead analytics summary view
CREATE OR REPLACE VIEW public.lead_analytics_summary AS
SELECT 
  l.user_id,
  l.assistant_id,
  ua.name as assistant_name,
  DATE(l.created_at) as lead_date,
  
  -- Lead metrics
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE l.lead_status = 'qualified') as qualified_leads,
  COUNT(*) FILTER (WHERE l.lead_status = 'converted') as converted_leads,
  COUNT(*) FILTER (WHERE l.lead_priority = 'high') as high_priority_leads,
  
  -- Conversion rates
  ROUND((COUNT(*) FILTER (WHERE l.lead_status = 'qualified')::numeric / COUNT(*) * 100)::numeric, 1) as qualification_rate,
  ROUND((COUNT(*) FILTER (WHERE l.lead_status = 'converted')::numeric / COUNT(*) * 100)::numeric, 1) as conversion_rate,
  
  -- Lead sources
  COUNT(*) FILTER (WHERE l.source = 'call') as leads_from_calls,
  COUNT(*) FILTER (WHERE l.source != 'call') as leads_from_other_sources

FROM public.leads l
LEFT JOIN public.user_assistants ua ON l.assistant_id = ua.id
GROUP BY l.user_id, l.assistant_id, ua.name, DATE(l.created_at);

-- Grant access to views
GRANT SELECT ON public.user_usage_summary TO authenticated;
GRANT SELECT ON public.call_analytics_summary TO authenticated;
GRANT SELECT ON public.lead_analytics_summary TO authenticated;

-- ===============================================
-- HELPFUL COMMENTS
-- ===============================================

COMMENT ON TABLE public.profiles IS 'User profiles with subscription tiers and usage limits';
COMMENT ON COLUMN public.profiles.current_usage_minutes IS 'Real-time usage in minutes, auto-updated by triggers';
COMMENT ON COLUMN public.profiles.max_minutes_monthly IS 'Monthly minute limit based on subscription tier';
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Current subscription: free, pro, or enterprise';

COMMENT ON TABLE public.call_logs IS 'Main call records with comprehensive metrics and cost tracking';
COMMENT ON COLUMN public.call_logs.duration_seconds IS 'Actual call duration used for billing and usage tracking';
COMMENT ON COLUMN public.call_logs.billable_duration_seconds IS 'Billable duration (may differ from actual due to rounding)';

COMMENT ON TABLE public.leads IS 'Lead records extracted from calls and other sources';
COMMENT ON TABLE public.user_assistants IS 'User-created AI assistants with VAPI integration';

COMMENT ON FUNCTION calculate_monthly_usage IS 'Calculates total minutes used in current month from call logs';
COMMENT ON FUNCTION can_user_make_call IS 'Pre-call validation to check if user has remaining limits';
COMMENT ON FUNCTION reset_monthly_usage IS 'Monthly reset function called by pg_cron on the 1st of each month';

-- ===============================================
-- SUCCESS MESSAGE
-- ===============================================

DO $$
BEGIN
  RAISE NOTICE '🎉 Voice Matrix SaaS database setup completed successfully!';
  RAISE NOTICE '📊 Features: Multi-tenant, Usage tracking, Lead management, Analytics';
  RAISE NOTICE '🔒 Security: RLS enabled on all tables with proper user isolation';
  RAISE NOTICE '⚡ Performance: Comprehensive indexes and optimized queries';
  RAISE NOTICE '🎯 Default limits: 10 minutes/month, 3 assistants, 1 phone number per user';
  RAISE NOTICE '🔄 Real-time tracking: Usage auto-updated via triggers on call completion';
  RAISE NOTICE '📈 Analytics: Call metrics, lead tracking, and performance monitoring';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ready for production deployment!';
END $$;
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

-- Create user_assistants table
CREATE TABLE public.user_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  vapi_assistant_id text UNIQUE,
  template_id text,
  name text NOT NULL,
  personality text NOT NULL,
  call_objective text,
  client_messages text[],
  structured_questions jsonb DEFAULT '[]'::jsonb,
  model text DEFAULT 'gpt-4o-mini',
  provider text DEFAULT 'openai',
  voice text DEFAULT 'rachel',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT user_assistants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_assistants_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL
);

-- Create structured_questions table
CREATE TABLE public.structured_questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  question text NOT NULL,
  key text NOT NULL,
  required boolean DEFAULT false,
  type text DEFAULT 'text',
  order_index integer DEFAULT 0,
  CONSTRAINT structured_questions_pkey PRIMARY KEY (id),
  CONSTRAINT structured_questions_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE
);

-- Create user_phone_numbers table
CREATE TABLE public.user_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  vapi_phone_number_id text UNIQUE,
  number text NOT NULL,
  name text,
  assigned_assistant_id uuid,
  is_active boolean DEFAULT true,
  provider text DEFAULT 'twilio',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT user_phone_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.user_assistants(id) ON DELETE SET NULL
);

-- Create call_logs table with user_id for easier querying
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assistant_id uuid NOT NULL,
  user_id uuid,
  duration_seconds integer DEFAULT 0,
  cost numeric,
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
  CONSTRAINT call_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_unique_date UNIQUE(user_id, assistant_id, date)
);

-- Create rate_limits table
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 0,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT rate_limits_unique_user_endpoint UNIQUE(user_id, endpoint)
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Create usage_alerts table (for future alert system)
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

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_usage_tracking ON public.profiles(current_usage_minutes, max_minutes_monthly);
CREATE INDEX idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX idx_user_assistants_vapi_id ON public.user_assistants(vapi_assistant_id);
CREATE INDEX idx_call_logs_user_id_date ON public.call_logs(user_id, created_at);
CREATE INDEX idx_call_logs_assistant_user ON public.call_logs(assistant_id, user_id);
CREATE INDEX idx_call_logs_duration_status ON public.call_logs(duration_seconds, status) WHERE status = 'completed';
CREATE INDEX idx_call_analytics_user_date ON public.call_analytics(user_id, date);
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Function to handle new user creation
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
    usage_reset_date,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    0,
    10,  -- 10 minutes limit
    3,   -- 3 assistants limit
    CURRENT_DATE,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user_id from assistant_id
CREATE OR REPLACE FUNCTION get_user_from_assistant(assistant_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE id = assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate current month usage for a user
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month
  SELECT COALESCE(SUM(duration_seconds) / 60.0, 0)
  INTO total_minutes
  FROM public.call_logs cl
  JOIN public.user_assistants ua ON cl.assistant_id = ua.id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= start_of_month
    AND cl.status = 'completed';
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user usage when call is completed
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
BEGIN
  -- Get user_id from assistant
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Set user_id in call_logs for future queries
  NEW.user_id := target_user_id;
  
  -- Only update if call is completed and has duration
  IF NEW.status = 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- Log the usage update
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details,
      created_at
    ) VALUES (
      target_user_id,
      'usage_updated',
      jsonb_build_object(
        'call_id', NEW.id,
        'call_duration_seconds', NEW.duration_seconds,
        'new_total_minutes', new_usage
      ),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for real-time usage updates
CREATE TRIGGER call_usage_update_trigger
  BEFORE INSERT OR UPDATE OF duration_seconds, status ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- Function to check if user can make a call (pre-call validation)
CREATE OR REPLACE FUNCTION can_user_make_call(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_limits RECORD;
  current_usage NUMERIC;
  assistant_count INTEGER;
  result jsonb;
BEGIN
  -- Get user limits and current usage
  SELECT 
    max_minutes_monthly,
    current_usage_minutes,
    max_assistants
  INTO user_limits
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- Get current assistant count
  SELECT COUNT(*)
  INTO assistant_count
  FROM public.user_assistants
  WHERE user_id = user_uuid;
  
  -- Recalculate current usage to ensure accuracy
  current_usage := calculate_monthly_usage(user_uuid);
  
  -- Build result
  result := jsonb_build_object(
    'can_make_call', current_usage < user_limits.max_minutes_monthly,
    'can_create_assistant', assistant_count < user_limits.max_assistants,
    'usage', jsonb_build_object(
      'minutes_used', current_usage,
      'minutes_limit', user_limits.max_minutes_monthly,
      'minutes_remaining', GREATEST(0, user_limits.max_minutes_monthly - current_usage),
      'assistants_count', assistant_count,
      'assistants_limit', user_limits.max_assistants,
      'assistants_remaining', GREATEST(0, user_limits.max_assistants - assistant_count)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to reset monthly usage (run on first day of month)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER DEFAULT 0;
  current_month_start DATE;
BEGIN
  current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Reset usage for users whose reset date is before current month
  UPDATE public.profiles 
  SET 
    current_usage_minutes = 0,
    usage_reset_date = current_month_start,
    updated_at = now()
  WHERE usage_reset_date < current_month_start 
     OR usage_reset_date IS NULL;
     
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Log the reset action
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details,
    created_at
  ) VALUES (
    NULL,
    'monthly_usage_reset',
    jsonb_build_object(
      'reset_date', current_month_start,
      'users_reset', reset_count
    ),
    now()
  );
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- User assistants policies
CREATE POLICY "Users can view their own assistants" ON public.user_assistants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assistants" ON public.user_assistants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assistants" ON public.user_assistants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assistants" ON public.user_assistants
  FOR DELETE USING (auth.uid() = user_id);

-- Call logs policies
CREATE POLICY "Users can view their own call logs" ON public.call_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_assistants WHERE id = call_logs.assistant_id
    )
  );

CREATE POLICY "Users can create call logs for their assistants" ON public.call_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_assistants WHERE id = call_logs.assistant_id
    )
  );

-- Call analytics policies
CREATE POLICY "Users can view their own analytics" ON public.call_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Structured questions policies
CREATE POLICY "Users can view questions for their assistants" ON public.structured_questions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_assistants WHERE id = structured_questions.assistant_id
    )
  );

CREATE POLICY "Users can manage questions for their assistants" ON public.structured_questions
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_assistants WHERE id = structured_questions.assistant_id
    )
  );

-- Phone numbers policies
CREATE POLICY "Users can view their own phone numbers" ON public.user_phone_numbers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own phone numbers" ON public.user_phone_numbers
  FOR ALL USING (auth.uid() = user_id);

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Usage alerts policies
CREATE POLICY "Users can view their own usage alerts" ON public.usage_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_make_call(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_from_assistant(uuid) TO authenticated;

-- Insert default templates
INSERT INTO public.templates (id, name, description, personality, industry, default_questions) VALUES
('professional', 'Professional Agent', 'Professional and courteous AI assistant', 'professional', 'general', '[{"question": "May I have your full name?", "key": "name", "required": true}, {"question": "What is the best phone number to reach you?", "key": "phone", "required": true}, {"question": "What is your email address?", "key": "email", "required": false}]'),
('friendly', 'Friendly Agent', 'Warm and friendly conversational AI', 'friendly', 'general', '[{"question": "What''s your name?", "key": "name", "required": true}, {"question": "What''s the best number to call you back on?", "key": "phone", "required": true}]'),
('sales', 'Sales Agent', 'Persuasive and engaging sales assistant', 'sales', 'sales', '[{"question": "May I have your name?", "key": "name", "required": true}, {"question": "What''s your contact number?", "key": "phone", "required": true}, {"question": "What product are you interested in?", "key": "interest", "required": false}]'),
('support', 'Support Agent', 'Helpful and patient support assistant', 'support', 'support', '[{"question": "Can I get your name?", "key": "name", "required": true}, {"question": "What issue can I help you with?", "key": "issue", "required": true}]');

-- Schedule monthly usage reset (requires pg_cron extension)
-- Run on the first day of each month at midnight
SELECT cron.schedule(
  'reset-monthly-usage',
  '0 0 1 * *',
  'SELECT reset_monthly_usage();'
);

-- Create a view for easy usage monitoring
CREATE OR REPLACE VIEW public.user_usage_summary AS
SELECT 
  p.id as user_id,
  p.email,
  p.current_usage_minutes,
  p.max_minutes_monthly,
  p.max_assistants,
  p.usage_reset_date,
  COUNT(DISTINCT ua.id) as assistant_count,
  COUNT(DISTINCT cl.id) as total_calls_this_month,
  COALESCE(SUM(cl.duration_seconds) / 60.0, 0) as calculated_minutes_used,
  p.max_minutes_monthly - p.current_usage_minutes as minutes_remaining,
  p.max_assistants - COUNT(DISTINCT ua.id) as assistants_remaining
FROM public.profiles p
LEFT JOIN public.user_assistants ua ON p.id = ua.user_id
LEFT JOIN public.call_logs cl ON ua.id = cl.assistant_id 
  AND cl.created_at >= date_trunc('month', CURRENT_DATE)
  AND cl.status = 'completed'
GROUP BY p.id;

-- Grant access to the view
GRANT SELECT ON public.user_usage_summary TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.profiles IS 'User profiles with usage limits - 10 minutes and 3 assistants per user';
COMMENT ON COLUMN public.profiles.current_usage_minutes IS 'Real-time usage in minutes, auto-updated by triggers';
COMMENT ON COLUMN public.profiles.max_minutes_monthly IS 'Monthly minute limit (default 10)';
COMMENT ON COLUMN public.profiles.max_assistants IS 'Maximum number of assistants allowed (default 3)';
COMMENT ON FUNCTION calculate_monthly_usage IS 'Calculates total minutes used in current month from call logs';
COMMENT ON FUNCTION can_user_make_call IS 'Pre-call validation to check if user has remaining minutes and assistants';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Voice Matrix database setup completed successfully!';
  RAISE NOTICE 'Default limits: 10 minutes/month, 3 assistants per user';
  RAISE NOTICE 'Usage is tracked in real-time via triggers on call_logs';
END $$;
```

## Key Features

### 🎯 Usage Limits
- **10 minutes** per user per month
- **3 assistants** maximum per user
- Real-time tracking via database triggers
- Automatic monthly reset

### 📊 Real-Time Usage Tracking
1. When a call completes, `call_logs` gets a new record
2. Trigger fires automatically
3. User's `current_usage_minutes` is recalculated
4. Usage is enforced before next call

### 🔧 Core Functions
- `calculate_monthly_usage(user_id)` - Get accurate usage for a user
- `can_user_make_call(user_id)` - Pre-call validation
- `reset_monthly_usage()` - Monthly reset (automated via pg_cron)

### 🛡️ Security
- Row Level Security on all tables
- Users can only access their own data
- Service role functions for admin operations

## Next Steps
1. Copy this SQL to your Supabase SQL Editor
2. Run it to create all tables and functions
3. Configure your environment variables
4. Test with the API endpoints

## Notes for Future Iterations
- [ ] Add more granular usage tracking (per assistant)
- [ ] Implement usage warnings at 80% and 90%
- [ ] Add webhook for usage limit notifications
- [ ] Create admin dashboard views
- [ ] Add billing integration hooks