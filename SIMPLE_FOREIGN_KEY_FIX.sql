-- SIMPLE FIX - Only fix the foreign key constraint issue
-- Your main error: Key (assistant_id)=(49f85a9a-dc4f-4b0a-98db-4068f09c9efc) is not present in table "user_assistants"

-- =============================================
-- STEP 1: Drop the incorrect foreign key constraint
-- =============================================
-- The current constraint is probably pointing to user_assistants.id instead of vapi_assistant_id
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- =============================================
-- STEP 2: Ensure vapi_assistant_id is unique (required for foreign key)
-- =============================================
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_vapi_assistant_id_unique 
UNIQUE (vapi_assistant_id) ON CONFLICT DO NOTHING;

-- =============================================
-- STEP 3: Check data compatibility before creating foreign key
-- =============================================
-- This query will show you any orphaned call logs
-- (call logs with assistant_id that don't exist in user_assistants.vapi_assistant_id)
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM public.call_info_log cil
    WHERE cil.assistant_id NOT IN (
        SELECT ua.vapi_assistant_id 
        FROM public.user_assistants ua 
        WHERE ua.vapi_assistant_id IS NOT NULL
    );
    
    RAISE NOTICE 'Found % orphaned call logs', orphaned_count;
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Listing first 10 orphaned assistant_ids:';
        FOR rec IN 
            SELECT DISTINCT cil.assistant_id
            FROM public.call_info_log cil
            WHERE cil.assistant_id NOT IN (
                SELECT ua.vapi_assistant_id 
                FROM public.user_assistants ua 
                WHERE ua.vapi_assistant_id IS NOT NULL
            )
            LIMIT 10
        LOOP
            RAISE NOTICE 'Orphaned assistant_id: %', rec.assistant_id;
        END LOOP;
    END IF;
END $$;

-- =============================================
-- STEP 4: Clean up orphaned data (OPTIONAL - uncomment if needed)
-- =============================================
-- Uncomment this if you want to delete call logs with no matching assistant
-- DELETE FROM public.call_info_log 
-- WHERE assistant_id NOT IN (
--     SELECT vapi_assistant_id 
--     FROM public.user_assistants 
--     WHERE vapi_assistant_id IS NOT NULL
-- );

-- =============================================
-- STEP 5: Create the correct foreign key constraint
-- =============================================
-- This points assistant_id to vapi_assistant_id (both should be TEXT now)
ALTER TABLE public.call_info_log 
ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.user_assistants(vapi_assistant_id);

-- =============================================
-- VERIFICATION
-- =============================================
-- Check the foreign key was created correctly
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
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'call_info_log'
  AND kcu.column_name = 'assistant_id';

SELECT 'Foreign key fix completed!' as status;