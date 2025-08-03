-- Emergency fix: Stop any automatic phone number queries during assistant creation
-- This might be caused by triggers, views, or foreign key constraints

-- 1. Check for any triggers on user_assistants that might access phone numbers
SELECT 
    'TRIGGERS_ON_USER_ASSISTANTS' as check_type,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'user_assistants';

-- 2. Check for any foreign key constraints that might cascade to phone numbers
SELECT 
    'FOREIGN_KEYS_FROM_ASSISTANTS' as check_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'user_assistants';

-- 3. Check for any foreign key constraints pointing TO user_assistants
SELECT 
    'FOREIGN_KEYS_TO_ASSISTANTS' as check_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'user_assistants';

-- 4. Temporarily disable any triggers that might be causing the issue
-- (We'll re-enable them after identifying the problem)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'user_assistants'
    LOOP
        EXECUTE format('ALTER TABLE user_assistants DISABLE TRIGGER %I', trigger_record.trigger_name);
        RAISE NOTICE 'Disabled trigger: %', trigger_record.trigger_name;
    END LOOP;
END
$$;