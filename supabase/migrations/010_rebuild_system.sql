-- CRITICAL SYSTEM REBUILD: Remove phone numbers, simplify for admin-client model
-- This migration removes the phone number system completely and simplifies the schema

-- 1. Drop phone number system completely
DROP TABLE IF EXISTS public.client_phone_numbers CASCADE;

-- 2. Modify client_assistants table - Keep only what's needed
-- Remove phone_number_id from call_logs first (if it references client_phone_numbers)
ALTER TABLE public.call_logs DROP COLUMN IF EXISTS phone_number_id;

-- 3. Simplify client_assistants table structure
-- Drop columns that are no longer needed for the new model
ALTER TABLE public.client_assistants 
  DROP COLUMN IF EXISTS assigned_at,
  DROP COLUMN IF EXISTS is_active;

-- 4. Ensure client_assistants has exactly what we need for admin assignment
-- Client-editable fields (these can be updated via VAPI PATCH):
--   - display_name (client customization)
--   - first_message (client customization) 
--   - voice (client customization)
--   - model (client customization)
--   - eval_method (client customization)
--   - max_call_duration (client customization)

-- Admin-assigned fields (read-only for clients):
--   - vapi_assistant_id (assigned by admin)
--   - system_prompt (read-only from VAPI)

-- 5. Add refresh timestamp to track when data was last synced from VAPI
ALTER TABLE public.client_assistants 
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 6. Update call_logs table to remove phone number dependencies
-- Remove any phone-related columns
ALTER TABLE public.call_logs 
  DROP COLUMN IF EXISTS phone_number_id,
  ADD COLUMN IF NOT EXISTS phone_number text; -- Simple text field for logging the number used

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_assistants_client_id ON public.client_assistants(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON public.call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON public.call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_time ON public.call_logs(call_time DESC);

-- 8. Add comments to document the new system
COMMENT ON TABLE public.clients IS 'Client accounts with PIN-based authentication. Admin assigns VAPI assistants to clients.';
COMMENT ON TABLE public.client_assistants IS 'VAPI assistants assigned to clients by admin. Clients can edit limited fields only.';
COMMENT ON TABLE public.call_logs IS 'Call analytics data. Phone numbers are handled entirely in VAPI, logged as text here.';

-- 9. Create function to sync assistant data from VAPI (placeholder - will be implemented in API)
CREATE OR REPLACE FUNCTION public.refresh_assistant_from_vapi(assistant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called from the API when refresh button is clicked
  -- Updates last_synced_at timestamp
  UPDATE public.client_assistants 
  SET last_synced_at = timezone('utc'::text, now())
  WHERE id = assistant_id;
  
  RETURN true;
END;
$$;