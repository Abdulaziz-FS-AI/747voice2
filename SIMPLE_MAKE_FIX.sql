-- SIMPLE FIX: Just make Make.com inserts work without touching existing functions
-- This addresses only the immediate null assistant_id issue

-- =============================================
-- OPTION 1: Remove NOT NULL constraint temporarily to see what Make.com is actually sending
-- =============================================

-- Allow NULL values temporarily so we can see what Make.com is sending
ALTER TABLE public.call_info_log ALTER COLUMN assistant_id DROP NOT NULL;

-- This will let Make.com inserts succeed even if assistant_id is null
-- Then we can check what data is actually being sent

-- =============================================
-- OPTION 2: Check if the problem is the foreign key constraint itself
-- =============================================

-- Drop the foreign key constraint temporarily
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- Now Make.com can insert any value without foreign key validation
-- This isolates whether the issue is:
-- a) Make.com not sending assistant_id at all (null constraint)
-- b) Make.com sending wrong format for foreign key (foreign key constraint)

-- =============================================
-- VERIFICATION: Check current table state
-- =============================================

-- Check if assistant_id is now nullable
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'assistant_id';

-- Check if foreign key constraint is gone
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'call_info_log' 
  AND constraint_type = 'FOREIGN KEY';

SELECT 'Constraints relaxed. Try Make.com insert now and see what data gets stored.' as next_step;

-- =============================================
-- AFTER MAKE.COM TEST: Run this to see what was inserted
-- =============================================

-- After Make.com runs, check what actually got inserted:
-- SELECT assistant_id, vapi_call_id, duration_minutes, created_at 
-- FROM public.call_info_log 
-- ORDER BY created_at DESC 
-- LIMIT 5;

-- This will show us:
-- 1. Is assistant_id null or does it have a value?
-- 2. What format is the value (UUID, VAPI ID, etc.)?
-- 3. What other data Make.com is sending