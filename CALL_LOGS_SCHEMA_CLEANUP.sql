-- =============================================
-- CALL LOGS SCHEMA CLEANUP
-- =============================================
-- Remove redundant fields and rename call_status to evaluation
-- =============================================

-- 1. First, drop existing RLS policies that depend on user_id
DROP POLICY IF EXISTS "Users can view own call logs" ON call_logs;
DROP POLICY IF EXISTS "Users can insert own call logs" ON call_logs;
DROP POLICY IF EXISTS "Service role full access call logs" ON call_logs;

-- 2. Create new RLS policies using assistant_id join (more efficient)
-- Drop and recreate to avoid "already exists" errors
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

-- 3. Now remove redundant user_id column (assistant_id already provides user context)
ALTER TABLE call_logs DROP COLUMN IF EXISTS user_id;

-- 4. Fix duration columns (duration_minutes is computed from duration_seconds)
-- First, drop the computed duration_minutes column
ALTER TABLE call_logs DROP COLUMN IF EXISTS duration_minutes;

-- Create a new duration_minutes column as regular column (not computed)
ALTER TABLE call_logs ADD COLUMN duration_minutes integer DEFAULT 0;

-- Copy data from duration_seconds to duration_minutes (convert seconds to minutes)
UPDATE call_logs 
SET duration_minutes = CEIL(duration_seconds::numeric / 60.0)::integer
WHERE duration_seconds IS NOT NULL;

-- Now we can safely drop duration_seconds
ALTER TABLE call_logs DROP COLUMN IF EXISTS duration_seconds;

-- 5. Rename call_status to evaluation (more accurate for demo system)
ALTER TABLE call_logs RENAME COLUMN call_status TO evaluation;

-- 4. Update evaluation column to use better enum values
ALTER TABLE call_logs 
ALTER COLUMN evaluation TYPE text,
ALTER COLUMN evaluation SET DEFAULT 'pending';

-- Add check constraint for evaluation values
ALTER TABLE call_logs 
ADD CONSTRAINT call_logs_evaluation_check 
CHECK (evaluation IN ('excellent', 'good', 'average', 'poor', 'pending', 'failed'));

-- 5. Update any existing data (set default evaluation)
UPDATE call_logs 
SET evaluation = 'completed' 
WHERE evaluation = 'completed';

UPDATE call_logs 
SET evaluation = 'failed' 
WHERE evaluation = 'failed';

UPDATE call_logs 
SET evaluation = 'pending' 
WHERE evaluation NOT IN ('excellent', 'good', 'average', 'poor', 'pending', 'failed');

-- 6. Update any existing call records to have valid evaluations
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
WHERE evaluation NOT IN ('excellent', 'good', 'average', 'poor', 'pending', 'failed');

-- 7. Verify the cleanup
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_logs' 
ORDER BY ordinal_position;

-- 8. Check current data integrity
SELECT 
    evaluation, 
    COUNT(*) as count,
    AVG(duration_minutes) as avg_duration_mins
FROM call_logs 
GROUP BY evaluation 
ORDER BY count DESC;