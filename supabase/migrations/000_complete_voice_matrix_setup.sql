-- Voice Matrix Complete Database Setup
-- This is a consolidated migration for new Supabase projects
-- Includes simplified subscription system with usage limits

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- For scheduled tasks

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.usage_alerts CASCADE;
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
  current_usage_minutes NUMERIC DEFAULT 0,
  max_minutes_monthly INTEGER DEFAULT 10,
  max_assistants INTEGER DEFAULT 3,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create templates table
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