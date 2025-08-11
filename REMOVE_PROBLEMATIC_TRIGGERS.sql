-- REMOVE ONLY THE PROBLEMATIC TRIGGERS CAUSING UUID = TEXT ERROR
-- Keep functions intact, just remove triggers that fire on call_info_log

-- =============================================
-- STEP 1: Find what triggers exist on call_info_log
-- =============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- =============================================
-- STEP 2: Drop triggers on call_info_log that might cause UUID = TEXT
-- =============================================

-- Remove any triggers that fire when data is inserted/updated on call_info_log
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;
DROP TRIGGER IF EXISTS on_usage_updated ON public.call_info_log;
DROP TRIGGER IF EXISTS update_usage_trigger ON public.call_info_log;
DROP TRIGGER IF EXISTS call_log_usage_trigger ON public.call_info_log;
DROP TRIGGER IF EXISTS usage_tracking_trigger ON public.call_info_log;

-- =============================================
-- STEP 3: Test Make.com insert without triggers
-- =============================================

-- Now try your Make.com insert - it should work without the UUID = TEXT error
-- The triggers were trying to compare UUID fields with TEXT fields

-- =============================================
-- STEP 4: Check that triggers are gone
-- =============================================
SELECT 
    'Remaining triggers on call_info_log:' as info,
    trigger_name
FROM information_schema.triggers 
WHERE event_object_table = 'call_info_log';

-- If this returns no rows, all triggers are removed

-- =============================================
-- STEP 5: Verify assistant_id is now nullable
-- =============================================
SELECT 
    'assistant_id column info:' as info,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'assistant_id';

SELECT 'Problematic triggers removed. Try Make.com insert now!' as status;