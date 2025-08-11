-- =============================================
-- INCREMENTAL DATABASE FIX FOR VOICE MATRIX
-- =============================================
-- This version checks for existing objects before creating them
-- Only creates what's missing
-- =============================================

-- =============================================
-- STEP 1: CREATE MISSING PHONE NUMBERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    phone_number text NOT NULL,
    friendly_name text NOT NULL,
    provider text DEFAULT 'twilio' NOT NULL CHECK (provider IN ('twilio', 'vapi')),
    vapi_phone_id text UNIQUE,
    vapi_credential_id text,
    assigned_assistant_id uuid REFERENCES public.user_assistants(id) ON DELETE SET NULL,
    webhook_url text,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    twilio_account_sid text,
    twilio_auth_token text,
    assigned_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, phone_number)
);

-- Enable RLS on phone numbers
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 2: CREATE MISSING RLS POLICIES ONLY
-- =============================================

-- Check if phone numbers policies exist, create only if missing
DO $$ 
BEGIN
    -- Phone numbers policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_phone_numbers' AND policyname = 'Users can view own phone numbers') THEN
        CREATE POLICY "Users can view own phone numbers" ON public.user_phone_numbers
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_phone_numbers' AND policyname = 'Users can create own phone numbers') THEN
        CREATE POLICY "Users can create own phone numbers" ON public.user_phone_numbers
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_phone_numbers' AND policyname = 'Users can update own phone numbers') THEN
        CREATE POLICY "Users can update own phone numbers" ON public.user_phone_numbers
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_phone_numbers' AND policyname = 'Users can delete own phone numbers') THEN
        CREATE POLICY "Users can delete own phone numbers" ON public.user_phone_numbers
            FOR DELETE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_phone_numbers' AND policyname = 'Service role full access phone numbers') THEN
        CREATE POLICY "Service role full access phone numbers" ON public.user_phone_numbers
            FOR ALL 
            USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
            WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');
    END IF;

    -- Service role policies for other tables if missing
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Service role full access profiles') THEN
        CREATE POLICY "Service role full access profiles" ON public.profiles
            FOR ALL 
            USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
            WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_assistants' AND policyname = 'Service role full access assistants') THEN
        CREATE POLICY "Service role full access assistants" ON public.user_assistants
            FOR ALL 
            USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
            WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'call_logs' AND policyname = 'Service role full access call_logs') THEN
        CREATE POLICY "Service role full access call_logs" ON public.call_logs
            FOR ALL 
            USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
            WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'structured_questions' AND policyname = 'Service role full access structured_questions') THEN
        CREATE POLICY "Service role full access structured_questions" ON public.structured_questions
            FOR ALL 
            USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
            WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');
    END IF;
END $$;

-- =============================================
-- STEP 3: GRANT COMPREHENSIVE PERMISSIONS
-- =============================================

-- Grant all permissions to required roles
GRANT ALL PRIVILEGES ON public.profiles TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.user_assistants TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.user_phone_numbers TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.call_logs TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.structured_questions TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.templates TO authenticated, service_role, supabase_admin;
GRANT ALL PRIVILEGES ON public.cleanup_jobs TO authenticated, service_role, supabase_admin;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, supabase_admin;

-- =============================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_assistant_id ON public.user_phone_numbers(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_vapi_phone_id ON public.user_phone_numbers(vapi_phone_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_active ON public.user_phone_numbers(is_active) WHERE is_active = true;

-- =============================================
-- STEP 5: FIX EXISTING DATA ISSUES
-- =============================================

-- Add assistant_state to existing assistants that don't have it
UPDATE public.user_assistants 
SET assistant_state = 'active' 
WHERE assistant_state IS NULL AND deleted_at IS NULL;

-- Mark deleted assistants properly
UPDATE public.user_assistants 
SET assistant_state = 'deleted' 
WHERE assistant_state IS NULL AND deleted_at IS NOT NULL;

-- =============================================
-- STEP 6: ADD MISSING COLUMNS IF NEEDED
-- =============================================

-- Ensure max_minutes_total column exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'max_minutes_total') THEN
        ALTER TABLE public.profiles ADD COLUMN max_minutes_total integer DEFAULT 10 NOT NULL;
    END IF;
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- 1. Verify phone numbers table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_phone_numbers'
) as phone_table_exists;

-- 2. Check your assistants
SELECT 
    id,
    name,
    vapi_assistant_id,
    assistant_state,
    CASE 
        WHEN vapi_assistant_id IS NULL THEN '❌ No VAPI ID'
        WHEN vapi_assistant_id LIKE 'fallback_%' THEN '⚠️ Fallback ID'
        ELSE '✅ Valid VAPI ID'
    END as vapi_status,
    created_at
FROM public.user_assistants
WHERE assistant_state = 'active' OR assistant_state IS NULL
ORDER BY created_at DESC;

-- 3. Check permissions on phone numbers table
SELECT 
    table_name, 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'user_phone_numbers'
AND grantee IN ('authenticated', 'service_role', 'supabase_admin')
ORDER BY table_name, grantee, privilege_type;

-- =============================================
-- COMPLETION SUMMARY
-- =============================================
-- 
-- ✅ WHAT WAS FIXED:
-- 
-- 1. ✅ Created missing user_phone_numbers table if it didn't exist
-- 2. ✅ Added RLS policies only if they were missing
-- 3. ✅ Added proper service role access if missing
-- 4. ✅ Fixed assistant_state field issues in existing data
-- 5. ✅ Added comprehensive permissions
-- 6. ✅ Created performance indexes
-- 7. ✅ Updated existing data consistency
-- 
-- 🎯 RESULTS:
-- - Phone number creation should now work
-- - Delete functionality should now work  
-- - Service role operations should work
-- - No more "policy already exists" errors
-- 
-- 📝 NEXT STEPS:
-- 1. Test phone number creation
-- 2. Test assistant deletion
-- 3. All features should work correctly!
-- 
-- =============================================