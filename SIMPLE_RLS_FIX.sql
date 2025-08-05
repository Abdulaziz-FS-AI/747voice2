-- SIMPLE RLS FIX: Allow service role access
-- Run this in Supabase SQL Editor

-- Option 1: Temporarily disable RLS (FASTEST - for immediate testing)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions DISABLE ROW LEVEL SECURITY;

-- Create test user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants,
  onboarding_completed
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test@voicematrix.ai',
  'Test User',
  'free',
  'active',
  0,
  10,
  3,
  true
) ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'active';

-- Verify test user exists
SELECT id, email, full_name FROM public.profiles WHERE email = 'test@voicematrix.ai';

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_assistants', 'structured_questions');

-- SUCCESS MESSAGE
SELECT 'RLS DISABLED - Assistant creation should work now!' as status;