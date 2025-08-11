-- =============================================
-- FIX AUTHENTICATION & RLS POLICIES
-- =============================================
-- This fixes the authentication issues by ensuring proper
-- RLS policies for profile creation and data access
-- =============================================

-- Drop conflicting policies first
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.user_assistants;
DROP POLICY IF EXISTS "Service role bypass" ON public.profiles;
DROP POLICY IF EXISTS "Service role bypass" ON public.user_assistants;

-- =============================================
-- PROFILES TABLE POLICIES
-- =============================================

-- Allow users to INSERT their own profile (critical for sign-up)
CREATE POLICY "Users can create own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Service role needs full access for server-side operations
CREATE POLICY "Service role full access profiles" ON public.profiles
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- =============================================
-- USER ASSISTANTS POLICIES
-- =============================================

-- Service role needs full access for server-side operations
CREATE POLICY "Service role full access assistants" ON public.user_assistants
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- =============================================
-- CALL LOGS POLICIES
-- =============================================

-- Service role needs full access for webhook insertions
CREATE POLICY "Service role full access call_logs" ON public.call_logs
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- =============================================
-- STRUCTURED QUESTIONS POLICIES
-- =============================================

-- Service role needs full access
CREATE POLICY "Service role full access structured_questions" ON public.structured_questions
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- =============================================
-- ENSURE PROPER PERMISSIONS
-- =============================================

-- Grant comprehensive permissions to all required roles
GRANT ALL PRIVILEGES ON public.profiles TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.user_assistants TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.call_logs TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.structured_questions TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.templates TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.cleanup_jobs TO authenticated, service_role, supabase_admin;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, supabase_admin;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if policies are working (run these after applying)
-- SELECT * FROM public.profiles; -- Should work for authenticated users
-- INSERT INTO public.profiles (id, email, full_name, max_assistants, max_minutes_total) 
-- VALUES ('test-uuid', 'test@example.com', 'Test User', 3, 10); -- Should work for service_role

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
-- 
-- ✅ Fixed RLS policies for authentication
-- ✅ Added missing INSERT policy for profiles
-- ✅ Ensured service role has full access for API operations
-- ✅ Granted proper permissions to all roles
-- 
-- This should resolve the ERR_BLOCKED_BY_CLIENT issue by allowing
-- proper profile creation during the authentication callback.
-- =============================================