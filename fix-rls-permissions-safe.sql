-- URGENT FIX: RLS Permission Issues (Safe Version)
-- This fixes the "permission denied for schema public" error
-- Note: This version doesn't reference error_logs table

-- 1. Grant necessary schema permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- 2. Grant table permissions for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- 3. Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 4. Fix RLS policies to be more permissive for user operations

-- Profiles table policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "service_role_all_profiles" ON profiles;

CREATE POLICY "profiles_all_access" ON profiles
    FOR ALL USING (
        auth.uid() = id OR 
        auth.jwt() ->> 'role' = 'service_role' OR
        current_setting('role') = 'service_role'
    );

-- User assistants policies
DROP POLICY IF EXISTS "assistants_select_own" ON user_assistants;
DROP POLICY IF EXISTS "assistants_all_own" ON user_assistants;
DROP POLICY IF EXISTS "service_role_all_assistants" ON user_assistants;

CREATE POLICY "assistants_all_access" ON user_assistants
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role' OR
        current_setting('role') = 'service_role'
    );

-- Call logs policies
DROP POLICY IF EXISTS "call_logs_select" ON call_logs;
DROP POLICY IF EXISTS "call_logs_insert" ON call_logs;

CREATE POLICY "call_logs_all_access" ON call_logs
    FOR ALL USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT user_id FROM user_assistants WHERE id = call_logs.assistant_id
        ) OR
        auth.jwt() ->> 'role' = 'service_role' OR
        current_setting('role') = 'service_role'
    );

-- Phone numbers policies (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_phone_numbers') THEN
        DROP POLICY IF EXISTS "phone_numbers_access" ON user_phone_numbers;
        
        CREATE POLICY "phone_numbers_all_access" ON user_phone_numbers
            FOR ALL USING (
                auth.uid() = user_id OR 
                auth.jwt() ->> 'role' = 'service_role' OR
                current_setting('role') = 'service_role'
            );
    END IF;
END $$;

-- Templates policies (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        DROP POLICY IF EXISTS "templates_read" ON templates;
        
        CREATE POLICY "templates_read_all" ON templates
            FOR SELECT TO authenticated
            USING (true);

        CREATE POLICY "templates_service_role" ON templates
            FOR ALL USING (
                auth.jwt() ->> 'role' = 'service_role' OR
                current_setting('role') = 'service_role'
            );
    END IF;
END $$;

-- Structured questions policies (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'structured_questions') THEN
        DROP POLICY IF EXISTS "structured_questions_access" ON structured_questions;
        
        CREATE POLICY "structured_questions_all_access" ON structured_questions
            FOR ALL USING (
                auth.uid() IN (
                    SELECT user_id FROM user_assistants WHERE id = structured_questions.assistant_id
                ) OR
                auth.jwt() ->> 'role' = 'service_role' OR
                current_setting('role') = 'service_role'
            );
    END IF;
END $$;

-- 5. Ensure core tables have RLS enabled but with proper policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on optional tables only if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_phone_numbers') THEN
        ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'structured_questions') THEN
        ALTER TABLE structured_questions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 6. Grant function execution permissions (only if functions exist)
DO $$ 
BEGIN
    -- Check if get_user_profile_safe function exists
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_profile_safe') THEN
        GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO authenticated;
        GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO service_role;
    END IF;
    
    -- Check if ensure_user_profile function exists
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'ensure_user_profile') THEN
        GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO authenticated;
        GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO service_role;
    END IF;
END $$;

-- 7. Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- 8. Refresh permissions
NOTIFY pgrst, 'reload schema';