-- =============================================
-- VERIFY CALL LOGS SCHEMA IS CORRECT
-- =============================================
-- This script verifies and ensures the call_logs schema is properly configured
-- for the Voice Matrix demo system
-- =============================================

-- 1. Verify current call_logs schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'call_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current RLS policies
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'call_logs';

-- 3. Ensure proper RLS policies exist (drop and recreate for consistency)
DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can insert own call logs" ON call_logs;
DROP POLICY IF EXISTS "Service role full access call logs" ON call_logs;

-- New policies using assistant_id join (current schema)
DROP POLICY IF EXISTS "Users can view own call logs via assistant" ON call_logs;
CREATE POLICY "Users can view own call logs via assistant" ON call_logs
    FOR SELECT USING (
        assistant_id IN (
            SELECT id FROM user_assistants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own call logs via assistant" ON call_logs;
CREATE POLICY "Users can insert own call logs via assistant" ON call_logs
    FOR INSERT WITH CHECK (
        assistant_id IN (
            SELECT id FROM user_assistants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role full access call logs" ON call_logs;
CREATE POLICY "Service role full access call logs" ON call_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 4. Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_evaluation ON call_logs(evaluation);
CREATE INDEX IF NOT EXISTS idx_call_logs_duration ON call_logs(duration_minutes) WHERE duration_minutes > 0;

-- 5. Update any existing invalid evaluations to valid values
UPDATE call_logs 
SET evaluation = CASE
    WHEN evaluation = 'completed' THEN 'good'
    WHEN evaluation = 'success' THEN 'good'  
    WHEN evaluation = 'fail' THEN 'failed'
    WHEN evaluation = 'error' THEN 'failed'
    WHEN evaluation = 'timeout' THEN 'poor'
    WHEN evaluation IS NULL THEN 'pending'
    ELSE evaluation
END
WHERE evaluation NOT IN ('excellent', 'good', 'average', 'poor', 'pending', 'failed') 
   OR evaluation IS NULL;

-- 6. Verify the final state
SELECT 
    'call_logs schema verification' as check_type,
    COUNT(*) as total_records,
    COUNT(DISTINCT evaluation) as unique_evaluations,
    AVG(duration_minutes) as avg_duration_minutes,
    COUNT(DISTINCT assistant_id) as unique_assistants
FROM call_logs;

-- 7. Show evaluation breakdown
SELECT 
    evaluation,
    COUNT(*) as count,
    ROUND(AVG(duration_minutes), 2) as avg_duration_minutes
FROM call_logs 
GROUP BY evaluation 
ORDER BY count DESC;

-- 8. Verify RLS policies are active
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'call_logs'
GROUP BY tablename;