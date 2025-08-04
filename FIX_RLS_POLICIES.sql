-- Fix RLS Policies to allow service role access
-- Run this in your Supabase SQL Editor

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "assistants_user_access" ON public.user_assistants;
DROP POLICY IF EXISTS "profiles_user_access" ON public.profiles;
DROP POLICY IF EXISTS "structured_questions_access" ON public.structured_questions;

-- Create fixed policy for profiles table
CREATE POLICY "profiles_user_access" ON public.profiles
FOR ALL USING (
  -- User can access their own profile
  (auth.uid() = id) 
  OR 
  -- Service role can access everything
  (auth.role() = 'service_role')
  OR
  -- Alternative service role check
  ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
);

-- Create fixed policy for user_assistants table  
CREATE POLICY "assistants_user_access" ON public.user_assistants
FOR ALL USING (
  -- User can access their own assistants
  (auth.uid() = user_id)
  OR
  -- Service role can access everything
  (auth.role() = 'service_role') 
  OR
  -- Alternative service role check
  ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
);

-- Create policy for structured_questions if it exists
CREATE POLICY "structured_questions_access" ON public.structured_questions
FOR ALL USING (
  -- User can access questions for their assistants
  assistant_id IN (
    SELECT id FROM public.user_assistants 
    WHERE user_id = auth.uid()
  )
  OR
  -- Service role can access everything
  (auth.role() = 'service_role')
  OR
  ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'user_assistants', 'structured_questions')
ORDER BY tablename, policyname;