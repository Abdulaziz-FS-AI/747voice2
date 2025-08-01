-- Row Level Security (RLS) Policies for Voice Matrix
-- Ensures complete user data isolation and security

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Templates policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view templates" ON public.templates
  FOR SELECT TO authenticated USING (is_active = true);

-- User assistants policies
CREATE POLICY "Users can view own assistants" ON public.user_assistants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistants" ON public.user_assistants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistants" ON public.user_assistants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistants" ON public.user_assistants
  FOR DELETE USING (auth.uid() = user_id);

-- Structured questions policies
CREATE POLICY "Users can view questions for own assistants" ON public.structured_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = structured_questions.assistant_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for own assistants" ON public.structured_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = structured_questions.assistant_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions for own assistants" ON public.structured_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = structured_questions.assistant_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions for own assistants" ON public.structured_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = structured_questions.assistant_id 
      AND user_id = auth.uid()
    )
  );

-- Phone numbers policies
CREATE POLICY "Users can view own phone numbers" ON public.user_phone_numbers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone numbers" ON public.user_phone_numbers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers" ON public.user_phone_numbers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers" ON public.user_phone_numbers
  FOR DELETE USING (auth.uid() = user_id);

-- Call logs policies
CREATE POLICY "Users can view call logs for own assistants" ON public.call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = call_logs.assistant_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert call logs for own assistants" ON public.call_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_assistants 
      WHERE id = call_logs.assistant_id 
      AND user_id = auth.uid()
    )
  );

-- Call analytics policies
CREATE POLICY "Users can view own call analytics" ON public.call_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call analytics" ON public.call_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call analytics" ON public.call_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- Rate limits policies (system-level, no user access needed)
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL TO service_role USING (true);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.templates TO authenticated;
GRANT ALL ON public.user_assistants TO authenticated;
GRANT ALL ON public.structured_questions TO authenticated;
GRANT ALL ON public.user_phone_numbers TO authenticated;
GRANT SELECT, INSERT ON public.call_logs TO authenticated;
GRANT ALL ON public.call_analytics TO authenticated;

-- Grant service role permissions for system operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;