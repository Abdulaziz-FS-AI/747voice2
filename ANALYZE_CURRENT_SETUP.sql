-- ANALYSIS ONLY - NO CHANGES MADE
-- Let's understand the current setup before fixing anything

-- =============================================
-- 1. Check current foreign key constraints on call_info_log
-- =============================================
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'call_info_log';

-- =============================================
-- 2. Check data types of relevant columns
-- =============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE (table_name = 'call_info_log' AND column_name = 'assistant_id')
   OR (table_name = 'user_assistants' AND column_name IN ('id', 'vapi_assistant_id'))
ORDER BY table_name, column_name;

-- =============================================
-- 3. Sample data to understand the mismatch
-- =============================================
-- Show sample vapi_assistant_id values from user_assistants
SELECT 'user_assistants sample:' as table_info;
SELECT id, vapi_assistant_id, created_at 
FROM public.user_assistants 
ORDER BY created_at DESC 
LIMIT 5;

-- Show sample assistant_id values from call_info_log
SELECT 'call_info_log sample:' as table_info;
SELECT id, assistant_id, created_at, status
FROM public.call_info_log 
ORDER BY created_at DESC 
LIMIT 5;

-- =============================================
-- 4. Check for data mismatches
-- =============================================
-- Count total records
SELECT 
    'user_assistants' as table_name, 
    COUNT(*) as total_records,
    COUNT(vapi_assistant_id) as non_null_vapi_assistant_id
FROM public.user_assistants
UNION ALL
SELECT 
    'call_info_log' as table_name, 
    COUNT(*) as total_records,
    COUNT(assistant_id) as non_null_assistant_id
FROM public.call_info_log;

-- Find orphaned call_info_log records
SELECT 'Orphaned call_info_log records:' as analysis;
SELECT COUNT(*) as orphaned_count
FROM public.call_info_log cil
WHERE cil.assistant_id NOT IN (
    SELECT ua.vapi_assistant_id 
    FROM public.user_assistants ua 
    WHERE ua.vapi_assistant_id IS NOT NULL
);

-- =============================================
-- 5. Check existing RLS policies (to ensure we don't break them)
-- =============================================
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression
FROM pg_policies 
WHERE tablename IN ('call_info_log', 'user_assistants')
ORDER BY tablename, policyname;