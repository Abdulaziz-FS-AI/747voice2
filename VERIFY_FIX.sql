-- VERIFICATION: Check that the fix worked correctly
-- Run this to confirm everything is working

-- 1. Verify foreign key constraint exists and points to correct column
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

-- 2. Verify data types are now aligned
SELECT 
    'Data Type Check:' as test,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE (table_name = 'call_info_log' AND column_name = 'assistant_id')
   OR (table_name = 'user_assistants' AND column_name = 'id')
ORDER BY table_name, column_name;

-- 3. Verify RLS policies were recreated
SELECT 
    'RLS Policy Check:' as test,
    policyname,
    cmd as policy_type,
    CASE 
        WHEN policyname LIKE '%insert%' THEN 'INSERT Policy'
        WHEN policyname LIKE '%view%' THEN 'SELECT Policy'
        ELSE 'Other Policy'
    END as policy_description
FROM pg_policies 
WHERE tablename = 'call_info_log'
  AND policyname IN (
    'Users can insert own call logs via assistant',
    'Users can view own call logs via assistant'
  );

-- 4. Test that the foreign key relationship works
SELECT 'Sample Data Test:' as test;
SELECT 
    ua.id as user_assistant_internal_id,
    ua.vapi_assistant_id,
    ua.name as assistant_name,
    COUNT(cil.id) as call_count
FROM public.user_assistants ua
LEFT JOIN public.call_info_log cil ON ua.id = cil.assistant_id
GROUP BY ua.id, ua.vapi_assistant_id, ua.name
ORDER BY call_count DESC
LIMIT 5;

SELECT 'Verification complete! ✅' as status;