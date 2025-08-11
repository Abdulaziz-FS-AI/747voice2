-- =============================================
-- CLEANUP ASSISTANT STATUS - DEMO SYSTEM
-- =============================================
-- Remove all disabled/enabled status from demo system
-- Ensure all active assistants show as "Active" only
-- =============================================

-- =============================================
-- STEP 1: UPDATE ASSISTANT STATES
-- =============================================

-- Set all non-deleted assistants to active state
UPDATE public.user_assistants 
SET 
    assistant_state = 'active',
    updated_at = NOW()
WHERE 
    deleted_at IS NULL 
    AND (assistant_state IS NULL OR assistant_state != 'deleted');

-- Remove any is_disabled or is_enabled columns if they exist
DO $$ 
BEGIN
    -- Drop is_disabled column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'is_disabled') THEN
        ALTER TABLE public.user_assistants DROP COLUMN is_disabled;
        RAISE NOTICE 'Dropped is_disabled column';
    END IF;
    
    -- Drop is_enabled column if it exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'is_enabled') THEN
        ALTER TABLE public.user_assistants DROP COLUMN is_enabled;
        RAISE NOTICE 'Dropped is_enabled column';
    END IF;
    
    -- Drop is_active column if it exists (different from assistant_state)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'is_active') THEN
        ALTER TABLE public.user_assistants DROP COLUMN is_active;
        RAISE NOTICE 'Dropped is_active column';
    END IF;
END $$;

-- =============================================
-- STEP 2: ENSURE ASSISTANT_STATE FIELD EXISTS
-- =============================================

-- Add assistant_state column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'assistant_state') THEN
        ALTER TABLE public.user_assistants 
        ADD COLUMN assistant_state text DEFAULT 'active' CHECK (assistant_state IN ('active', 'expired', 'deleted'));
        RAISE NOTICE 'Added assistant_state column';
    END IF;
END $$;

-- =============================================
-- STEP 3: UPDATE CONFIG DATA
-- =============================================

-- Remove any disabled/enabled status from config JSON
UPDATE public.user_assistants 
SET config = config - 'is_disabled' - 'is_enabled' - 'disabled' - 'enabled' - 'status'
WHERE config IS NOT NULL;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- 1. Check all assistants now show active
SELECT 
    id,
    name,
    assistant_state,
    vapi_assistant_id,
    CASE 
        WHEN vapi_assistant_id IS NULL THEN '❌ No VAPI ID'
        WHEN vapi_assistant_id LIKE 'fallback_%' THEN '⚠️ Fallback ID'
        ELSE '✅ Valid VAPI ID'
    END as vapi_status,
    created_at
FROM public.user_assistants
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- 2. Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_assistants' 
AND column_name IN ('assistant_state', 'is_disabled', 'is_enabled', 'is_active')
ORDER BY column_name;

-- 3. Count assistants by state
SELECT 
    assistant_state,
    COUNT(*) as count
FROM public.user_assistants
WHERE deleted_at IS NULL
GROUP BY assistant_state;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
-- 
-- ✅ CLEANUP COMPLETED:
-- 
-- 1. ✅ All assistants set to 'active' state
-- 2. ✅ Removed is_disabled, is_enabled, is_active columns
-- 3. ✅ Cleaned config JSON of status fields
-- 4. ✅ Ensured assistant_state field exists
-- 
-- 🎯 RESULT:
-- - All assistants should now show as "Active"
-- - No more "Disabled" status in UI
-- - No enable/disable toggles should appear
-- 
-- =============================================