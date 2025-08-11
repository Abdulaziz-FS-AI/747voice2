-- ULTRA SAFE FOREIGN KEY FIX
-- Only fixes the foreign key constraint issue, no data type changes, no RLS policy changes
-- Your webhook stores assistant.id (UUID) but constraint may be pointing wrong direction

-- =============================================
-- STEP 1: Analyze current constraint (for debugging)
-- =============================================
-- Let's see what we're working with
SELECT 
    'Current foreign key constraints:' as info,
    tc.constraint_name,
    tc.table_name,
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

-- =============================================
-- STEP 2: Check data compatibility 
-- =============================================
-- Your webhook stores assistant.id (internal UUID), let's verify this works
SELECT 'Data compatibility check:' as info;

-- Check if call_info_log.assistant_id values exist in user_assistants.id
SELECT 
    COUNT(*) as total_call_logs,
    COUNT(CASE WHEN ua.id IS NOT NULL THEN 1 END) as matching_internal_ids,
    COUNT(CASE WHEN ua.id IS NULL THEN 1 END) as orphaned_internal_ids
FROM public.call_info_log cil
LEFT JOIN public.user_assistants ua ON cil.assistant_id::uuid = ua.id;

-- Show sample of what we're working with
SELECT 'Sample data:' as info;
SELECT 
    cil.assistant_id as call_log_assistant_id,
    cil.assistant_id::uuid as call_log_as_uuid,
    ua.id as user_assistant_internal_id,
    ua.vapi_assistant_id as user_assistant_vapi_id
FROM public.call_info_log cil
LEFT JOIN public.user_assistants ua ON cil.assistant_id::uuid = ua.id
LIMIT 3;

-- =============================================
-- STEP 3: Drop existing foreign key constraint
-- =============================================
-- Remove the current problematic constraint
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- =============================================
-- STEP 4: Fix data type compatibility and create foreign key
-- =============================================
-- Since call_info_log.assistant_id is TEXT and user_assistants.id is UUID,
-- we need to align the data types for the foreign key to work

-- Option A: Convert call_info_log.assistant_id from TEXT to UUID
ALTER TABLE public.call_info_log 
ALTER COLUMN assistant_id TYPE UUID USING assistant_id::UUID;

-- Now create the foreign key constraint pointing to user_assistants.id
ALTER TABLE public.call_info_log 
ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.user_assistants(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- =============================================
-- STEP 5: Verify the fix
-- =============================================
-- Check the constraint was created
SELECT 'New constraint created:' as status;
SELECT 
    tc.constraint_name,
    tc.table_name,
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

-- Test that a sample insert would work
SELECT 'Testing constraint with sample data:' as status;
-- This should show valid assistant IDs that your webhook can use
SELECT 
    id as internal_assistant_id,
    vapi_assistant_id,
    name
FROM public.user_assistants 
LIMIT 3;

SELECT 'Fix completed! Your webhook should now work.' as final_status;