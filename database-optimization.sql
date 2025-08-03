-- Voice Matrix Database Optimization
-- Level 10 Performance & Security Improvements

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- 1. Add missing indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_subscription_type ON profiles(subscription_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_usage_reset_date ON profiles(usage_reset_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_user_id ON user_assistants(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_vapi_id ON user_assistants(vapi_assistant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_template_id ON user_assistants(template_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_assistants_created_at ON user_assistants(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_user_created ON call_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_vapi_id ON user_phone_numbers(vapi_phone_number_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_phone_numbers_assistant_id ON user_phone_numbers(assigned_assistant_id);

-- 2. Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_analytics_user_date ON call_analytics(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_analytics_assistant_date ON call_analytics(assistant_id, date DESC);

-- 3. Partial indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_call_logs_active ON call_logs(user_id, created_at DESC) 
WHERE status IN ('completed', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_active ON user_assistants(user_id, created_at DESC) 
WHERE vapi_assistant_id IS NOT NULL;

-- =====================================================
-- ERROR LOGGING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS error_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_id text NOT NULL UNIQUE,
    user_id uuid REFERENCES profiles(id),
    error_name text NOT NULL,
    error_message text NOT NULL,
    error_stack text,
    component_stack text,
    user_agent text,
    url text,
    timestamp timestamptz NOT NULL,
    resolved boolean DEFAULT false,
    severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- =====================================================
-- IMPROVED SECURITY FUNCTIONS
-- =====================================================

-- Function to safely get user profile with limits
CREATE OR REPLACE FUNCTION get_user_profile_safe(user_uuid uuid)
RETURNS TABLE (
    id uuid,
    email text,
    current_usage_minutes numeric,
    max_minutes_monthly integer,
    max_assistants integer,
    assistant_count bigint,
    can_create_assistant boolean,
    can_make_calls boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.current_usage_minutes,
        p.max_minutes_monthly,
        p.max_assistants,
        COALESCE(a.assistant_count, 0) as assistant_count,
        (COALESCE(a.assistant_count, 0) < p.max_assistants) as can_create_assistant,
        (p.current_usage_minutes < p.max_minutes_monthly) as can_make_calls
    FROM profiles p
    LEFT JOIN (
        SELECT user_id, COUNT(*) as assistant_count
        FROM user_assistants 
        WHERE user_id = user_uuid
        GROUP BY user_id
    ) a ON p.id = a.user_id
    WHERE p.id = user_uuid;
END;
$$;

-- Function to create profile with proper defaults
CREATE OR REPLACE FUNCTION ensure_user_profile(user_uuid uuid, user_email text, user_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Try to get existing profile
    SELECT id INTO profile_id FROM profiles WHERE id = user_uuid;
    
    -- Create if doesn't exist
    IF profile_id IS NULL THEN
        INSERT INTO profiles (
            id, 
            email, 
            full_name,
            current_usage_minutes,
            max_minutes_monthly,
            max_assistants,
            usage_reset_date,
            onboarding_completed
        ) VALUES (
            user_uuid,
            user_email,
            COALESCE(user_name, split_part(user_email, '@', 1)),
            0,
            10, -- Free tier: 10 minutes
            3,  -- Free tier: 3 assistants
            CURRENT_DATE,
            false
        )
        RETURNING id INTO profile_id;
        
        RAISE NOTICE 'Created new profile for user: %', user_uuid;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- =====================================================
-- USAGE TRACKING OPTIMIZATION
-- =====================================================

-- Improved usage tracking trigger
CREATE OR REPLACE FUNCTION update_user_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_uuid uuid;
    call_minutes numeric;
BEGIN
    -- Get user ID from assistant
    SELECT ua.user_id INTO user_uuid
    FROM user_assistants ua
    WHERE ua.id = NEW.assistant_id;
    
    IF user_uuid IS NULL THEN
        RAISE WARNING 'Could not find user for assistant: %', NEW.assistant_id;
        RETURN NEW;
    END IF;
    
    -- Calculate minutes (round up)
    call_minutes := CEIL(COALESCE(NEW.duration_seconds, 0)::numeric / 60);
    
    -- Update user usage
    UPDATE profiles 
    SET 
        current_usage_minutes = current_usage_minutes + call_minutes,
        updated_at = now()
    WHERE id = user_uuid;
    
    -- Log the update
    RAISE NOTICE 'Updated usage for user % by % minutes', user_uuid, call_minutes;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS update_usage_on_call_log ON call_logs;
CREATE TRIGGER update_usage_on_call_log
    AFTER INSERT ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_usage();

-- =====================================================
-- RLS POLICIES OPTIMIZATION
-- =====================================================

-- Enhanced RLS policies with better performance
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own assistants" ON user_assistants;
DROP POLICY IF EXISTS "Users can manage own assistants" ON user_assistants;

-- Create optimized policies
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "assistants_select_own" ON user_assistants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assistants_all_own" ON user_assistants
    FOR ALL USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "service_role_all_profiles" ON profiles
    FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_all_assistants" ON user_assistants
    FOR ALL USING (current_setting('role') = 'service_role');

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Function to clean old error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete error logs older than 30 days
    DELETE FROM error_logs 
    WHERE created_at < (now() - interval '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old error logs', deleted_count;
    RETURN deleted_count;
END;
$$;

-- Function to update analytics tables
CREATE OR REPLACE FUNCTION refresh_call_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This would update call_analytics table
    -- Implementation depends on specific analytics needs
    INSERT INTO call_analytics (user_id, date, total_calls, successful_calls, total_duration_minutes)
    SELECT 
        cl.user_id,
        CURRENT_DATE,
        COUNT(*),
        COUNT(*) FILTER (WHERE cl.status = 'completed'),
        SUM(CEIL(cl.duration_seconds::numeric / 60))
    FROM call_logs cl
    WHERE DATE(cl.created_at) = CURRENT_DATE
    AND cl.user_id IS NOT NULL
    GROUP BY cl.user_id
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_calls = EXCLUDED.total_calls,
        successful_calls = EXCLUDED.successful_calls,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        updated_at = now();
    
    RAISE NOTICE 'Updated call analytics for today';
END;
$$;

-- =====================================================
-- PERFORMANCE MONITORING
-- =====================================================

-- View for monitoring slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 1000 -- Queries taking more than 1 second on average
ORDER BY mean_time DESC;

-- View for table statistics
CREATE OR REPLACE VIEW table_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for functions
GRANT EXECUTE ON FUNCTION get_user_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_call_analytics() TO service_role;

-- Grant access to views for monitoring
GRANT SELECT ON slow_queries TO service_role;
GRANT SELECT ON table_stats TO service_role;

COMMIT;