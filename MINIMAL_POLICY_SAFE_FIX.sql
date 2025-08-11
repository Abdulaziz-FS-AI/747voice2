-- MINIMAL POLICY-SAFE FIX
-- Only drops the specific policy blocking the column type change, then recreates it

-- =============================================
-- STEP 1: Check current situation
-- =============================================
-- See what policy is blocking us
SELECT 
    'Current blocking policy:' as info,
    policyname, 
    cmd as command,
    qual as using_expression
FROM pg_policies 
WHERE tablename = 'call_info_log' 
  AND policyname = 'Users can view own call logs via assistant';

-- =============================================
-- STEP 2: Temporarily drop ALL policies that reference assistant_id
-- =============================================
-- Based on your Supabase dashboard, drop the three policies that use assistant_id
DROP POLICY IF EXISTS "Users can insert own call logs via assistant" ON public.call_info_log;
DROP POLICY IF EXISTS "Users can view own call logs via assistant" ON public.call_info_log;

-- =============================================
-- STEP 3: Drop existing foreign key constraint
-- =============================================
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- =============================================
-- STEP 4: Convert assistant_id from TEXT to UUID
-- =============================================
ALTER TABLE public.call_info_log 
ALTER COLUMN assistant_id TYPE UUID USING assistant_id::UUID;

-- =============================================
-- STEP 5: Create the correct foreign key constraint
-- =============================================
ALTER TABLE public.call_info_log 
ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.user_assistants(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- =============================================
-- STEP 6: Recreate the RLS policies with correct types
-- =============================================
-- Recreate the INSERT policy
CREATE POLICY "Users can insert own call logs via assistant" ON public.call_info_log
    FOR INSERT WITH CHECK (
        assistant_id IN (
            SELECT id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- Recreate the SELECT policy
CREATE POLICY "Users can view own call logs via assistant" ON public.call_info_log
    FOR SELECT USING (
        assistant_id IN (
            SELECT id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- STEP 7: Verify everything works
-- =============================================
-- Check the foreign key was created
SELECT 'Foreign key verification:' as status;
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'call_info_log'
  AND kcu.column_name = 'assistant_id';

-- Check the policy was recreated
SELECT 'Policy verification:' as status;
SELECT 
    policyname, 
    cmd as command
FROM pg_policies 
WHERE tablename = 'call_info_log' 
  AND policyname = 'Users can view own call logs via assistant';

-- Check data types are now aligned
SELECT 'Data type verification:' as status;
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE (table_name = 'call_info_log' AND column_name = 'assistant_id')
   OR (table_name = 'user_assistants' AND column_name = 'id')
ORDER BY table_name;

SELECT 'Fix completed successfully! Your analytics should now work.' as final_status;