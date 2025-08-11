-- OPTION: Simplify by using VAPI assistant ID directly as primary key
-- This eliminates the need for internal vs external ID mapping

-- WARNING: This is a breaking change. Test thoroughly first!

-- STEP 1: Drop existing foreign key constraint
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- STEP 2: Drop existing primary key and related constraints on user_assistants
ALTER TABLE public.user_assistants DROP CONSTRAINT IF EXISTS user_assistants_pkey;

-- STEP 3: Make vapi_assistant_id the primary key
-- First, ensure vapi_assistant_id is not null and unique
UPDATE public.user_assistants SET vapi_assistant_id = id WHERE vapi_assistant_id IS NULL;
ALTER TABLE public.user_assistants ALTER COLUMN vapi_assistant_id SET NOT NULL;
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_pkey PRIMARY KEY (vapi_assistant_id);

-- STEP 4: Update call_info_log to reference vapi_assistant_id directly
-- This assumes your current data uses internal IDs - we'd need to migrate the data
-- For now, let's create the new constraint pointing to vapi_assistant_id

-- Add foreign key that references vapi_assistant_id (which is now the primary key)
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(vapi_assistant_id) ON DELETE CASCADE;

-- STEP 5: Remove the old 'id' column (optional - could keep for compatibility)
-- ALTER TABLE public.user_assistants DROP COLUMN id;

-- STEP 6: Verify the structure
SELECT 
  'user_assistants' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_assistants' 
AND column_name IN ('id', 'vapi_assistant_id')
ORDER BY ordinal_position;