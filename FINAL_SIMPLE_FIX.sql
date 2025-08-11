-- FINAL FIX: Make assistant_id nullable and add proper foreign key
-- Based on your actual schema

-- =============================================
-- STEP 1: Remove NOT NULL constraint (if it exists in live database)
-- =============================================
ALTER TABLE public.call_info_log ALTER COLUMN assistant_id DROP NOT NULL;

-- =============================================  
-- STEP 2: Add foreign key constraint to vapi_assistant_id
-- =============================================
-- Your schema shows TEXT to TEXT, so this should work
ALTER TABLE public.call_info_log 
ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.user_assistants(vapi_assistant_id)
ON DELETE CASCADE;

-- =============================================
-- STEP 3: Check current state
-- =============================================
SELECT 
    'call_info_log.assistant_id:' as info,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'assistant_id';

-- Check foreign key was created
SELECT 
    'Foreign key check:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'call_info_log' 
  AND constraint_name LIKE '%assistant_id%';

-- =============================================
-- STEP 4: Test with your specific assistant
-- =============================================
-- Check if your VAPI assistant ID exists
SELECT 
    'Looking for Make.com assistant ID:' as test,
    id,
    vapi_assistant_id,
    name
FROM public.user_assistants 
WHERE vapi_assistant_id = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc';

SELECT 'Fix complete! Make.com should now work.' as status;