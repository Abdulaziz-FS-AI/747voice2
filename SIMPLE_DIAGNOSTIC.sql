-- SIMPLE DIAGNOSTIC - CHECK DATA TYPES ONLY
-- Let's see exactly what we're working with before fixing anything

-- =============================================
-- 1. Check call_info_log table structure
-- =============================================
\d public.call_info_log

-- =============================================  
-- 2. Check specific column types
-- =============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('call_info_log', 'user_assistants')
  AND column_name IN ('assistant_id', 'vapi_assistant_id', 'id')
ORDER BY table_name, column_name;

-- =============================================
-- 3. Check what data actually exists
-- =============================================
SELECT 'call_info_log sample data:' as info;
SELECT assistant_id, created_at 
FROM public.call_info_log 
ORDER BY created_at DESC 
LIMIT 3;

SELECT 'user_assistants sample data:' as info;
SELECT id, vapi_assistant_id, name
FROM public.user_assistants 
ORDER BY created_at DESC 
LIMIT 3;

-- =============================================
-- 4. Check existing foreign key constraints
-- =============================================
SELECT 
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
  AND tc.table_name = 'call_info_log';

-- =============================================
-- 5. List all functions that might cause the error
-- =============================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname LIKE '%assistant%' 
   OR proname LIKE '%usage%'
   OR proname LIKE '%call%'
ORDER BY proname;