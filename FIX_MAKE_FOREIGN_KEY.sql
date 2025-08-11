-- FIX FOR MAKE.COM DIRECT SUPABASE INSERTS
-- This makes the foreign key work with VAPI assistant IDs from Make.com

-- =============================================
-- STEP 1: Drop RLS policies that depend on assistant_id
-- =============================================
DROP POLICY IF EXISTS "Users can insert own call logs via assistant" ON public.call_info_log;
DROP POLICY IF EXISTS "Users can view own call logs via assistant" ON public.call_info_log;

-- =============================================
-- STEP 2: Drop current foreign key constraint
-- =============================================
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- =============================================
-- STEP 3: Change assistant_id back to TEXT (to match vapi_assistant_id)
-- =============================================
ALTER TABLE public.call_info_log 
ALTER COLUMN assistant_id TYPE TEXT USING assistant_id::TEXT;

-- =============================================
-- STEP 4: Create foreign key pointing to vapi_assistant_id
-- =============================================
ALTER TABLE public.call_info_log 
ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.user_assistants(vapi_assistant_id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- =============================================
-- STEP 5: Recreate RLS policies with correct logic
-- =============================================
-- For INSERT: allow if user owns the assistant with this vapi_assistant_id
CREATE POLICY "Users can insert own call logs via assistant" ON public.call_info_log
    FOR INSERT WITH CHECK (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- For SELECT: allow if user owns the assistant with this vapi_assistant_id  
CREATE POLICY "Users can view own call logs via assistant" ON public.call_info_log
    FOR SELECT USING (
        assistant_id IN (
            SELECT vapi_assistant_id FROM public.user_assistants 
            WHERE user_id = auth.uid()
        )
    );

-- =============================================
-- STEP 6: Verify the fix
-- =============================================
-- Check foreign key points to vapi_assistant_id
SELECT 
    'Foreign Key Check:' as test,
    tc.constraint_name,
    kcu.column_name as source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'call_info_log'
  AND kcu.column_name = 'assistant_id';

-- Check data types are aligned
SELECT 
    'Data Type Check:' as test,
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE (table_name = 'call_info_log' AND column_name = 'assistant_id')
   OR (table_name = 'user_assistants' AND column_name = 'vapi_assistant_id')
ORDER BY table_name, column_name;

-- Test with sample data
SELECT 'Sample Test:' as test;
SELECT 
    ua.vapi_assistant_id,
    ua.name,
    COUNT(cil.id) as call_count
FROM public.user_assistants ua
LEFT JOIN public.call_info_log cil ON ua.vapi_assistant_id = cil.assistant_id
GROUP BY ua.vapi_assistant_id, ua.name
ORDER BY call_count DESC
LIMIT 3;

SELECT 'Make.com fix complete! Your direct Supabase inserts should now work! ✅' as status;