-- Voice Matrix PIN-Based Client System
-- FIXED VERSION: Corrected schema errors and missing fields

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create clients table (PIN-based authentication)
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pin text NOT NULL UNIQUE CHECK (pin ~ '^[0-9]{6,8}$'), -- 6-8 digit PIN
  company_name text NOT NULL,
  contact_email text NOT NULL, -- Required for PIN change verification
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  notes text,
  pin_changed_at timestamp with time zone,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Create client_assistants table (manually assigned from VAPI)
CREATE TABLE public.client_assistants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  vapi_assistant_id text NOT NULL UNIQUE, -- Manually assigned VAPI ID
  
  -- Client-editable fields
  display_name text NOT NULL,
  first_message text,
  voice text,
  model text,
  eval_method text,
  max_call_duration integer DEFAULT 300, -- seconds
  
  -- Read-only fields (from VAPI)
  system_prompt text,
  questions jsonb DEFAULT '[]'::jsonb,
  
  -- Metadata
  assigned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  
  CONSTRAINT client_assistants_pkey PRIMARY KEY (id),
  CONSTRAINT client_assistants_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Create client_phone_numbers table (manually assigned from VAPI)
CREATE TABLE public.client_phone_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  vapi_phone_id text NOT NULL UNIQUE, -- Manually assigned VAPI phone ID
  phone_number text NOT NULL,
  friendly_name text NOT NULL,
  assigned_assistant_id uuid,
  
  -- Metadata
  assigned_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active boolean DEFAULT true,
  notes text,
  
  CONSTRAINT client_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT client_phone_numbers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT client_phone_numbers_assigned_assistant_id_fkey FOREIGN KEY (assigned_assistant_id) REFERENCES public.client_assistants(id) ON DELETE SET NULL
);

-- Create call_logs table for analytics (FIXED: Added missing fields)
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  assistant_id uuid NOT NULL,
  phone_number_id uuid, -- Added missing field
  vapi_call_id text UNIQUE,
  
  -- Call details
  caller_number text,
  call_time timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  end_time timestamp with time zone,
  duration_seconds integer DEFAULT 0,
  call_status text DEFAULT 'in_progress', -- in_progress, completed, failed, cancelled
  call_type text DEFAULT 'inbound', -- inbound, outbound
  
  -- Call content
  transcript text,
  recording_url text, -- Added missing field
  structured_data jsonb DEFAULT '{}'::jsonb,
  success_evaluation boolean, -- Changed from text to boolean
  summary text,
  
  -- Cost tracking
  cost numeric(10,4) DEFAULT 0,
  
  -- Assistant info cache
  assistant_display_name text, -- Added for quick reference
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT call_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.client_assistants(id) ON DELETE CASCADE,
  CONSTRAINT call_logs_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES public.client_phone_numbers(id) ON DELETE SET NULL
);

-- Create call_analytics table for dashboard stats
CREATE TABLE public.call_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  assistant_id uuid,
  call_log_id uuid, -- Added reference to specific call
  
  -- Analytics data
  date date NOT NULL DEFAULT CURRENT_DATE,
  duration_seconds integer DEFAULT 0,
  cost numeric(10,4) DEFAULT 0,
  success_evaluation boolean,
  
  -- Aggregated fields for daily stats
  total_calls integer DEFAULT 0,
  successful_calls integer DEFAULT 0,
  failed_calls integer DEFAULT 0,
  total_duration_seconds integer DEFAULT 0,
  total_cost_cents integer DEFAULT 0,
  average_call_duration numeric(10,2) DEFAULT 0,
  success_rate numeric(5,2) DEFAULT 0,
  
  -- Call metadata
  has_recording boolean DEFAULT false,
  has_transcript boolean DEFAULT false,
  transcript_length integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT call_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT call_analytics_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT call_analytics_assistant_id_fkey FOREIGN KEY (assistant_id) REFERENCES public.client_assistants(id) ON DELETE SET NULL,
  CONSTRAINT call_analytics_call_log_id_fkey FOREIGN KEY (call_log_id) REFERENCES public.call_logs(id) ON DELETE CASCADE
);

-- Create client_sessions table for PIN authentication
CREATE TABLE public.client_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at timestamp with time zone NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
  last_accessed timestamp with time zone DEFAULT timezone('utc'::text, now()), -- Fixed: renamed from last_activity
  is_active boolean DEFAULT true,
  
  CONSTRAINT client_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT client_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- Create performance indexes
CREATE INDEX idx_clients_pin ON public.clients(pin);
CREATE INDEX idx_clients_active ON public.clients(is_active);
CREATE INDEX idx_clients_email ON public.clients(contact_email); -- Added index for email lookups

CREATE INDEX idx_client_assistants_client_id ON public.client_assistants(client_id);
CREATE INDEX idx_client_assistants_vapi_id ON public.client_assistants(vapi_assistant_id);
CREATE INDEX idx_client_assistants_active ON public.client_assistants(is_active);

CREATE INDEX idx_client_phone_numbers_client_id ON public.client_phone_numbers(client_id);
CREATE INDEX idx_client_phone_numbers_vapi_phone_id ON public.client_phone_numbers(vapi_phone_id);
CREATE INDEX idx_client_phone_numbers_active ON public.client_phone_numbers(is_active);
CREATE INDEX idx_client_phone_numbers_phone ON public.client_phone_numbers(phone_number); -- Added phone number index

CREATE INDEX idx_call_logs_client_id ON public.call_logs(client_id);
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_phone_number_id ON public.call_logs(phone_number_id); -- Added index
CREATE INDEX idx_call_logs_call_time ON public.call_logs(call_time); -- Fixed: renamed from started_at
CREATE INDEX idx_call_logs_vapi_call_id ON public.call_logs(vapi_call_id);
CREATE INDEX idx_call_logs_status ON public.call_logs(call_status); -- Added status index

CREATE INDEX idx_call_analytics_client_id ON public.call_analytics(client_id);
CREATE INDEX idx_call_analytics_date ON public.call_analytics(date);
CREATE INDEX idx_call_analytics_client_date ON public.call_analytics(client_id, date);
CREATE INDEX idx_call_analytics_call_log_id ON public.call_analytics(call_log_id); -- Added index

CREATE INDEX idx_client_sessions_token ON public.client_sessions(session_token);
CREATE INDEX idx_client_sessions_expires_at ON public.client_sessions(expires_at);
CREATE INDEX idx_client_sessions_active ON public.client_sessions(is_active);
CREATE INDEX idx_client_sessions_client_id ON public.client_sessions(client_id); -- Added client index

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER client_assistants_updated_at
  BEFORE UPDATE ON public.client_assistants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER client_phone_numbers_updated_at
  BEFORE UPDATE ON public.client_phone_numbers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER call_analytics_updated_at
  BEFORE UPDATE ON public.call_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- Create service role policies (allow all for service role)
CREATE POLICY "Service role has full access to clients" ON public.clients
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_assistants" ON public.client_assistants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_phone_numbers" ON public.client_phone_numbers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to call_logs" ON public.call_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to call_analytics" ON public.call_analytics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to client_sessions" ON public.client_sessions
  FOR ALL USING (auth.role() = 'service_role');