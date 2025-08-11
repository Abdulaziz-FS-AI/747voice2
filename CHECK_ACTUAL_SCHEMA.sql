-- CHECK WHAT ACTUALLY EXISTS IN YOUR DATABASE
-- Let's see the real current state

-- =============================================
-- 1. Check if call_info_log table exists
-- =============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'call_info_log'
) as call_info_log_exists;

-- =============================================
-- 2. Show actual call_info_log table structure
-- =============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================
-- 3. Check constraints on assistant_id column
-- =============================================
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.call_info_log'::regclass
  AND conname LIKE '%assistant_id%';

-- =============================================
-- 4. Check NOT NULL constraints
-- =============================================
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND table_schema = 'public'
  AND is_nullable = 'NO'
ORDER BY column_name;

-- =============================================
-- 5. Check current foreign key constraints
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
-- 6. Show recent failed inserts (if any data exists)
-- =============================================
SELECT 
    'Recent call_info_log entries:' as info,
    COUNT(*) as total_rows
FROM public.call_info_log;

-- Show sample data if exists
SELECT 
    id,
    assistant_id,
    vapi_call_id,
    duration_minutes,
    evaluation,
    created_at
FROM public.call_info_log 
ORDER BY created_at DESC 
LIMIT 5;

-- =============================================
-- 7. Check what user_assistants data looks like
-- =============================================
SELECT 
    'user_assistants sample:' as info,
    id as internal_id,
    vapi_assistant_id,
    name,
    user_id
FROM public.user_assistants 
ORDER BY created_at DESC 
LIMIT 3;