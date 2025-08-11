-- FINAL COMPREHENSIVE FIX - WITH RLS POLICY HANDLING
-- This fixes the "cannot alter type of a column used in a policy definition" error

-- =============================================
-- STEP 1: Drop trigger that depends on evaluation column
-- =============================================
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- =============================================
-- STEP 2: Drop RLS policies that depend on assistant_id column
-- =============================================
-- Find and drop all policies on call_info_log table
DROP POLICY IF EXISTS "Users can view own call logs via assistant" ON public.call_info_log;
DROP POLICY IF EXISTS "Users can insert own call logs" ON public.call_info_log;
DROP POLICY IF EXISTS "Users can update own call logs" ON public.call_info_log;
DROP POLICY IF EXISTS "Users can delete own call logs" ON public.call_info_log;
DROP POLICY IF EXISTS "call_logs_policy" ON public.call_info_log;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.call_info_log;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.call_info_log;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.call_info_log;

-- =============================================
-- STEP 3: Remove evaluation constraints
-- =============================================
-- Drop the old constraint (with old table name)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_evaluation_check;
-- Drop the constraint with new table name if it exists  
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_evaluation_check;

-- =============================================
-- STEP 4: Fix data type compatibility for foreign key
-- =============================================
-- Drop existing foreign key constraint (old names)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- Change assistant_id in call_info_log from UUID to TEXT to match vapi_assistant_id
ALTER TABLE public.call_info_log ALTER COLUMN assistant_id TYPE TEXT USING assistant_id::TEXT;

-- Ensure vapi_assistant_id has unique constraint (required for foreign key)
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_vapi_assistant_id_unique 
UNIQUE (vapi_assistant_id);

-- Create new foreign key pointing to vapi_assistant_id column (both TEXT now)
-- This allows Make.com to send VAPI IDs directly without lookup
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(vapi_assistant_id);

-- =============================================
-- STEP 5: Recreate RLS policies with correct data types
-- =============================================
-- Enable RLS on the table if not already enabled
ALTER TABLE public.call_info_log ENABLE ROW LEVEL SECURITY;

-- Recreate the main policy for viewing call logs
CREATE POLICY "Users can view own call logs via assistant" ON public.call_info_log
    FOR SELECT USING (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for inserting call logs
CREATE POLICY "Users can insert own call logs" ON public.call_info_log
    FOR INSERT WITH CHECK (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for updating call logs
CREATE POLICY "Users can update own call logs" ON public.call_info_log
    FOR UPDATE USING (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for deleting call logs
CREATE POLICY "Users can delete own call logs" ON public.call_info_log
    FOR DELETE USING (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- STEP 6: Fix the evaluation column constraints (with new data type)
-- =============================================
-- Add back the evaluation constraint
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_evaluation_check 
CHECK (evaluation IN ('positive', 'negative', 'neutral', 'pending') OR evaluation IS NULL);

-- =============================================
-- STEP 7: Recreate the usage tracking trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_call_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed calls with valid duration
    IF NEW.status = 'completed' AND NEW.duration > 0 THEN
        INSERT INTO public.usage_tracking (
            user_id,
            assistant_id,
            resource_type,
            usage_amount,
            recorded_at
        )
        VALUES (
            (SELECT user_id FROM public.user_assistants WHERE vapi_assistant_id = NEW.assistant_id),
            NEW.assistant_id,
            'call_minutes',
            GREATEST(1, CEILING(NEW.duration / 60.0)), -- Convert seconds to minutes, minimum 1
            NEW.ended_at
        )
        ON CONFLICT (user_id, assistant_id, resource_type, recorded_at) 
        DO UPDATE SET usage_amount = EXCLUDED.usage_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER call_usage_update_trigger
    AFTER INSERT OR UPDATE ON public.call_info_log
    FOR EACH ROW
    EXECUTE FUNCTION update_call_usage();

-- =============================================
-- STEP 8: Clean up any orphaned data
-- =============================================
-- Remove any call logs that don't have matching assistants
DELETE FROM public.call_info_log 
WHERE assistant_id NOT IN (SELECT vapi_assistant_id FROM public.user_assistants);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Verify the changes work
SELECT 'Schema verification:' as status;

-- Check if foreign key constraint exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'call_info_log' AND constraint_type = 'FOREIGN KEY';

-- Check if RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'call_info_log';

-- Check data types match
SELECT 
    'call_info_log.assistant_id' as column_name,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'call_info_log' AND column_name = 'assistant_id'
UNION ALL
SELECT 
    'user_assistants.vapi_assistant_id' as column_name,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'user_assistants' AND column_name = 'vapi_assistant_id';

SELECT 'Fix completed successfully!' as status;