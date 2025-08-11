-- SIMPLE FIX: Just point foreign key to vapi_assistant_id column
-- This way Make.com can send VAPI IDs directly without lookup

-- STEP 1: Drop existing foreign key constraint
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- STEP 2: Ensure vapi_assistant_id has unique constraint (required for foreign key)
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_vapi_assistant_id_unique 
UNIQUE (vapi_assistant_id);

-- STEP 3: Create foreign key pointing to vapi_assistant_id column
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(vapi_assistant_id) ON DELETE CASCADE;

-- STEP 4: Test the constraint
-- This should work now:
-- INSERT INTO call_info_log (assistant_id, ...) VALUES ('49f85a9a-dc4f-4b0a-98db-4068f09c9efc', ...);

SELECT 'Foreign key now points to vapi_assistant_id column' as status;