-- =============================================
-- VOICE MATRIX DEMO SYSTEM - CLEAN SCHEMA
-- =============================================
-- This schema supports a demo-only system where:
-- - Every user gets 3 assistants max
-- - 10 minutes total usage across all assistants
-- - 7 days maximum lifespan per assistant
-- - Auto-deletion when limits are reached
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. USER PROFILES (Simplified Demo Version)
-- =============================================
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    full_name text,
    
    -- Demo system limits (fixed for all users)
    max_assistants integer DEFAULT 3 NOT NULL,
    max_minutes_total integer DEFAULT 10 NOT NULL,
    current_usage_minutes integer DEFAULT 0 NOT NULL,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 2. ASSISTANT TEMPLATES (Simplified)
-- =============================================
CREATE TABLE public.templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    base_prompt text NOT NULL,
    customizable_fields jsonb DEFAULT '[]'::jsonb,
    voice_settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 3. USER ASSISTANTS (Demo Version with Auto-Delete)
-- =============================================
CREATE TABLE public.user_assistants (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
    vapi_assistant_id text UNIQUE,
    
    -- Assistant details
    name text NOT NULL,
    personality text DEFAULT 'professional' NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Demo system tracking
    usage_minutes integer DEFAULT 0 NOT NULL,
    max_lifetime_days integer DEFAULT 7 NOT NULL,
    
    -- Auto-deletion tracking
    expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '7 days') NOT NULL,
    will_auto_delete boolean DEFAULT true NOT NULL,
    deletion_reason text, -- 'expired', 'usage_limit', 'manual'
    
    -- State management
    assistant_state text DEFAULT 'active' CHECK (assistant_state IN ('active', 'expired', 'deleted')) NOT NULL,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at timestamp with time zone
);

-- =============================================
-- 4. USAGE TRACKING (Per Call)
-- =============================================
CREATE TABLE public.call_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assistant_id uuid REFERENCES public.user_assistants(id) ON DELETE CASCADE NOT NULL,
    vapi_call_id text,
    
    -- Call details
    duration_seconds integer DEFAULT 0,
    duration_minutes integer GENERATED ALWAYS AS (CEIL(duration_seconds::numeric / 60)) STORED,
    call_status text DEFAULT 'completed',
    
    -- Call metadata
    caller_number text,
    transcript text,
    summary text,
    structured_data jsonb DEFAULT '{}'::jsonb,
    
    -- Timestamps
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 5. STRUCTURED QUESTIONS (Simplified)
-- =============================================
CREATE TABLE public.structured_questions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    assistant_id uuid REFERENCES public.user_assistants(id) ON DELETE CASCADE NOT NULL,
    form_title text DEFAULT 'Assistant Questions',
    question_text text NOT NULL,
    structured_name text NOT NULL,
    data_type text DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean')) NOT NULL,
    is_required boolean DEFAULT false,
    order_index integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- 6. AUTO-CLEANUP JOBS LOG
-- =============================================
CREATE TABLE public.cleanup_jobs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_type text DEFAULT 'assistant_cleanup' NOT NULL,
    assistants_deleted integer DEFAULT 0,
    users_affected integer DEFAULT 0,
    execution_time_ms integer,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.structured_questions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- User Assistants: Users can only see their own assistants
CREATE POLICY "Users can view own assistants" ON public.user_assistants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assistants" ON public.user_assistants
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistants" ON public.user_assistants
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistants" ON public.user_assistants
    FOR DELETE USING (auth.uid() = user_id);

-- Call Logs: Users can only see their own call logs
CREATE POLICY "Users can view own call logs" ON public.call_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call logs" ON public.call_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Structured Questions: Users can only see questions for their assistants
CREATE POLICY "Users can view questions for own assistants" ON public.structured_questions
    FOR SELECT USING (
        assistant_id IN (
            SELECT id FROM public.user_assistants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions for own assistants" ON public.structured_questions
    FOR INSERT WITH CHECK (
        assistant_id IN (
            SELECT id FROM public.user_assistants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update questions for own assistants" ON public.structured_questions
    FOR UPDATE USING (
        assistant_id IN (
            SELECT id FROM public.user_assistants WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete questions for own assistants" ON public.structured_questions
    FOR DELETE USING (
        assistant_id IN (
            SELECT id FROM public.user_assistants WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Function: Create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Demo User')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update usage when call ends
CREATE OR REPLACE FUNCTION public.update_usage_on_call_end()
RETURNS trigger AS $$
BEGIN
    -- Update assistant usage
    UPDATE public.user_assistants
    SET 
        usage_minutes = usage_minutes + NEW.duration_minutes,
        updated_at = now()
    WHERE id = NEW.assistant_id;
    
    -- Update user total usage
    UPDATE public.profiles
    SET 
        current_usage_minutes = current_usage_minutes + NEW.duration_minutes,
        updated_at = now()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if assistant should be auto-deleted
CREATE OR REPLACE FUNCTION public.check_assistant_expiration()
RETURNS trigger AS $$
DECLARE
    user_total_usage integer;
    user_max_minutes integer;
BEGIN
    -- Get user's current usage and limits
    SELECT current_usage_minutes, max_minutes_total
    INTO user_total_usage, user_max_minutes
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Check if user has exceeded total usage limit
    IF user_total_usage >= user_max_minutes THEN
        -- Mark all user's assistants for deletion
        UPDATE public.user_assistants
        SET 
            assistant_state = 'expired',
            deletion_reason = 'usage_limit',
            deleted_at = now(),
            updated_at = now()
        WHERE user_id = NEW.user_id AND assistant_state = 'active';
        
        -- Also mark the current assistant
        NEW.assistant_state = 'expired';
        NEW.deletion_reason = 'usage_limit';
        NEW.deleted_at = now();
    
    -- Check if assistant has expired by time
    ELSIF NEW.expires_at <= now() THEN
        NEW.assistant_state = 'expired';
        NEW.deletion_reason = 'expired';
        NEW.deleted_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up expired assistants (for cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_assistants()
RETURNS jsonb AS $$
DECLARE
    deleted_count integer := 0;
    affected_users integer := 0;
    start_time timestamp := now();
    execution_time integer;
BEGIN
    -- Mark expired assistants as deleted
    WITH expired_assistants AS (
        UPDATE public.user_assistants
        SET 
            assistant_state = 'expired',
            deletion_reason = CASE 
                WHEN expires_at <= now() THEN 'expired'
                ELSE deletion_reason
            END,
            deleted_at = now(),
            updated_at = now()
        WHERE 
            assistant_state = 'active' 
            AND (expires_at <= now() OR deletion_reason IS NOT NULL)
        RETURNING user_id
    ),
    user_usage_check AS (
        UPDATE public.user_assistants ua
        SET 
            assistant_state = 'expired',
            deletion_reason = 'usage_limit',
            deleted_at = now(),
            updated_at = now()
        FROM public.profiles p
        WHERE 
            ua.user_id = p.id 
            AND ua.assistant_state = 'active'
            AND p.current_usage_minutes >= p.max_minutes_total
        RETURNING ua.user_id
    )
    SELECT 
        COUNT(*) as deleted,
        COUNT(DISTINCT user_id) as users
    INTO deleted_count, affected_users
    FROM (
        SELECT user_id FROM expired_assistants
        UNION ALL
        SELECT user_id FROM user_usage_check
    ) combined;
    
    -- Calculate execution time
    execution_time := EXTRACT(EPOCH FROM (now() - start_time)) * 1000;
    
    -- Log the cleanup job
    INSERT INTO public.cleanup_jobs (
        job_type,
        assistants_deleted,
        users_affected,
        execution_time_ms,
        details
    ) VALUES (
        'assistant_cleanup',
        deleted_count,
        affected_users,
        execution_time,
        jsonb_build_object(
            'start_time', start_time,
            'end_time', now(),
            'criteria', 'expired_or_usage_limit'
        )
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'assistants_deleted', deleted_count,
        'users_affected', affected_users,
        'execution_time_ms', execution_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Create profile on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update usage when call log is inserted
CREATE TRIGGER on_call_log_inserted
    AFTER INSERT ON public.call_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_usage_on_call_end();

-- Trigger: Check expiration when call usage is updated
CREATE TRIGGER on_usage_updated
    BEFORE UPDATE ON public.user_assistants
    FOR EACH ROW 
    WHEN (OLD.usage_minutes IS DISTINCT FROM NEW.usage_minutes)
    EXECUTE FUNCTION public.check_assistant_expiration();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Indexes for user_assistants
CREATE INDEX idx_user_assistants_user_id ON public.user_assistants(user_id);
CREATE INDEX idx_user_assistants_state ON public.user_assistants(assistant_state);
CREATE INDEX idx_user_assistants_expires_at ON public.user_assistants(expires_at) WHERE assistant_state = 'active';
CREATE INDEX idx_user_assistants_vapi_id ON public.user_assistants(vapi_assistant_id) WHERE vapi_assistant_id IS NOT NULL;

-- Indexes for call_logs
CREATE INDEX idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at);

-- Indexes for structured_questions
CREATE INDEX idx_structured_questions_assistant_id ON public.structured_questions(assistant_id);
CREATE INDEX idx_structured_questions_order ON public.structured_questions(assistant_id, order_index);

-- =============================================
-- INITIAL SEED DATA
-- =============================================

-- Insert default template
INSERT INTO public.templates (
    id,
    name,
    description,
    base_prompt,
    customizable_fields,
    voice_settings
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'Demo Real Estate Assistant',
    'A demo assistant for real estate lead qualification with 7-day expiration',
    'You are a helpful real estate assistant. Your goal is to qualify leads and gather contact information. Be professional and friendly.',
    '[
        {
            "name": "company_name",
            "label": "Company Name",
            "type": "text",
            "placeholder": "Enter your company name",
            "required": false
        },
        {
            "name": "personality",
            "label": "Personality",
            "type": "select",
            "options": [
                {"value": "professional", "label": "Professional"},
                {"value": "friendly", "label": "Friendly"},
                {"value": "casual", "label": "Casual"}
            ],
            "default": "professional",
            "required": true
        }
    ]'::jsonb,
    '{
        "default_voice": "Elliot",
        "available_voices": ["Elliot", "Sarah", "Michael", "Jessica"]
    }'::jsonb
);

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- View: Active assistants with usage stats
CREATE VIEW public.active_assistants_view AS
SELECT 
    ua.*,
    p.email as user_email,
    p.current_usage_minutes as user_total_usage,
    p.max_minutes_total as user_max_minutes,
    (p.max_minutes_total - p.current_usage_minutes) as user_remaining_minutes,
    EXTRACT(DAYS FROM (ua.expires_at - now())) as days_until_expiry,
    (ua.expires_at <= now()) as is_expired_by_time,
    (p.current_usage_minutes >= p.max_minutes_total) as is_expired_by_usage
FROM public.user_assistants ua
JOIN public.profiles p ON ua.user_id = p.id
WHERE ua.assistant_state = 'active';

-- View: User demo limits and usage
CREATE VIEW public.user_demo_status AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.current_usage_minutes,
    p.max_minutes_total,
    (p.max_minutes_total - p.current_usage_minutes) as remaining_minutes,
    COUNT(ua.id) as active_assistants,
    p.max_assistants,
    (p.max_assistants - COUNT(ua.id)) as remaining_assistant_slots,
    (p.current_usage_minutes >= p.max_minutes_total) as usage_limit_reached,
    (COUNT(ua.id) >= p.max_assistants) as assistant_limit_reached
FROM public.profiles p
LEFT JOIN public.user_assistants ua ON p.id = ua.user_id AND ua.assistant_state = 'active'
GROUP BY p.id, p.email, p.full_name, p.current_usage_minutes, p.max_minutes_total, p.max_assistants;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant permissions for tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_assistants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.structured_questions TO authenticated;
GRANT SELECT ON public.templates TO anon, authenticated;
GRANT SELECT ON public.cleanup_jobs TO authenticated;

-- Grant permissions for views
GRANT SELECT ON public.active_assistants_view TO authenticated;
GRANT SELECT ON public.user_demo_status TO authenticated;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_assistants() TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
-- Schema created successfully!
-- 
-- This demo system provides:
-- ✅ 3 assistants maximum per user
-- ✅ 10 minutes total usage limit
-- ✅ 7-day automatic expiration
-- ✅ Auto-cleanup functionality
-- ✅ Usage tracking per call
-- ✅ RLS security policies
-- ✅ Optimized indexes
-- ✅ Helpful views for monitoring
-- 
-- Next steps:
-- 1. Run this schema in your Supabase database
-- 2. Update API routes to enforce demo limits
-- 3. Set up cron job for cleanup_expired_assistants()
-- =============================================