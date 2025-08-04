-- ⚠️  TEMPORARY FIX: Disable RLS for testing
-- This should ONLY be used for development/testing
-- NEVER run this in production!

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on user_assistants table  
ALTER TABLE public.user_assistants DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other related tables if they exist
ALTER TABLE public.structured_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events DISABLE ROW LEVEL SECURITY;

-- Create test user if it doesn't exist
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
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  subscription_status = 'active';

-- Verify the user was created
SELECT 
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants
FROM public.profiles 
WHERE email = 'test@voicematrix.ai';

-- Show RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_assistants', 'structured_questions', 'call_logs', 'subscription_events');

-- ⚠️  IMPORTANT: After testing, re-enable RLS with:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
-- etc.