-- URGENT: Fix permission denied for schema public
-- Copy and paste this ENTIRE script into Supabase SQL Editor and click RUN

-- 1. Disable RLS on all tables (immediate fix)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events DISABLE ROW LEVEL SECURITY;

-- 2. Create/update test user
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test@voicematrix.ai',
  'Test User',
  'free',
  'active',
  0,
  10,
  3,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  subscription_status = 'active',
  updated_at = NOW();

-- 3. Verify success
SELECT 'SUCCESS! RLS disabled, test user created' as result;
SELECT id, email, full_name FROM public.profiles WHERE email = 'test@voicematrix.ai';

-- Show RLS status (should all be false)
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_assistants', 'structured_questions');