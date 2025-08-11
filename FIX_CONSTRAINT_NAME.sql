-- Remove evaluation constraint to allow flexible data types
-- The evaluation column should accept any data: boolean, string, number, etc.

-- Drop the old constraint (with old table name)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_evaluation_check;

-- Drop the constraint with new table name if it exists  
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_evaluation_check;

-- Change evaluation column to TEXT to accept any data type
ALTER TABLE public.call_info_log ALTER COLUMN evaluation TYPE TEXT;

-- Remove any NOT NULL constraint if present
ALTER TABLE public.call_info_log ALTER COLUMN evaluation DROP NOT NULL;

-- Verify no constraints remain on evaluation column
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.call_info_log'::regclass 
AND pg_get_constraintdef(oid) LIKE '%evaluation%';