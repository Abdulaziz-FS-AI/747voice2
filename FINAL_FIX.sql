-- FINAL COMPREHENSIVE FIX
-- This fixes all issues: evaluation constraints, foreign keys, and triggers

-- =============================================
-- STEP 1: Drop trigger that depends on evaluation column
-- =============================================
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- =============================================
-- STEP 2: Remove evaluation constraints
-- =============================================
-- Drop the old constraint (with old table name)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_evaluation_check;
-- Drop the constraint with new table name if it exists  
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_evaluation_check;

-- =============================================
-- STEP 3: Fix foreign key to use VAPI assistant ID
-- =============================================
-- Drop existing foreign key constraint (old names)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_assistant_id_fkey;

-- Ensure vapi_assistant_id has unique constraint (required for foreign key)
ALTER TABLE public.user_assistants ADD CONSTRAINT user_assistants_vapi_assistant_id_unique 
UNIQUE (vapi_assistant_id);

-- Create new foreign key pointing to vapi_assistant_id column
-- This allows Make.com to send VAPI IDs directly without lookup
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(vapi_assistant_id) ON DELETE CASCADE;

-- =============================================
-- STEP 4: Make evaluation column flexible
-- =============================================
-- Change evaluation column to TEXT to accept any data type (string, number, boolean)
ALTER TABLE public.call_info_log ALTER COLUMN evaluation TYPE TEXT;
-- Remove any NOT NULL constraint if present
ALTER TABLE public.call_info_log ALTER COLUMN evaluation DROP NOT NULL;

-- =============================================
-- STEP 5: Update helper function to work with VAPI IDs
-- =============================================
CREATE OR REPLACE FUNCTION get_user_from_assistant(vapi_assistant_uuid TEXT)
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT user_id 
    FROM public.user_assistants 
    WHERE vapi_assistant_id = vapi_assistant_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 6: Update usage calculation function to work with VAPI IDs
-- =============================================
CREATE OR REPLACE FUNCTION calculate_monthly_usage(user_uuid uuid)
RETURNS NUMERIC AS $$
DECLARE
  total_minutes NUMERIC DEFAULT 0;
  start_of_month DATE;
BEGIN
  -- Get start of current month
  start_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Sum all call durations for this user this month using vapi_assistant_id join
  SELECT COALESCE(SUM(cl.duration_minutes), 0)
  INTO total_minutes
  FROM public.call_info_log cl
  JOIN public.user_assistants ua ON cl.assistant_id = ua.vapi_assistant_id
  WHERE ua.user_id = user_uuid
    AND cl.created_at >= start_of_month
    AND (
      -- Accept various success indicators: strings, numbers, booleans
      cl.evaluation::TEXT ILIKE '%good%' OR 
      cl.evaluation::TEXT ILIKE '%excellent%' OR
      cl.evaluation::TEXT ILIKE '%completed%' OR
      cl.evaluation::TEXT ILIKE '%success%' OR
      cl.evaluation::TEXT IN ('0', '1', 'true', 'TRUE') OR
      cl.evaluation::TEXT = 'average'
    );
    
  RETURN total_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- STEP 7: Recreate trigger with flexible evaluation and VAPI ID support
-- =============================================
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  evaluation_text TEXT;
BEGIN
  -- Get user_id from VAPI assistant ID
  target_user_id := get_user_from_assistant(NEW.assistant_id);
  
  -- Convert evaluation to text for comparison (handles any data type)
  evaluation_text := COALESCE(NEW.evaluation::TEXT, '');
  
  -- Only update if call seems successful and has duration
  -- Accept various success indicators: 'good', 'excellent', 'completed', 'success', '0', '1', true, etc.
  IF NEW.duration_minutes > 0 AND (
    evaluation_text ILIKE '%good%' OR 
    evaluation_text ILIKE '%excellent%' OR
    evaluation_text ILIKE '%completed%' OR
    evaluation_text ILIKE '%success%' OR
    evaluation_text IN ('0', '1', 'true', 'TRUE') OR
    evaluation_text = 'average'
  ) THEN
    -- Calculate total usage for this month
    new_usage := calculate_monthly_usage(target_user_id);
    
    -- Update user's current usage
    UPDATE public.profiles 
    SET 
      current_usage_minutes = new_usage,
      updated_at = now()
    WHERE id = target_user_id;
    
    -- Log the usage update for debugging (if audit_logs table exists)
    BEGIN
      INSERT INTO public.audit_logs (
        user_id,
        action,
        details,
        created_at
      ) VALUES (
        target_user_id,
        'usage_updated',
        jsonb_build_object(
          'call_id', NEW.id,
          'call_duration_minutes', NEW.duration_minutes,
          'call_evaluation', NEW.evaluation,
          'evaluation_text', evaluation_text,
          'vapi_assistant_id', NEW.assistant_id,
          'new_total_minutes', new_usage
        ),
        now()
      );
    EXCEPTION WHEN undefined_table THEN
      -- audit_logs table doesn't exist, skip logging
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger with flexible evaluation and VAPI ID handling
CREATE TRIGGER call_usage_update_trigger
  AFTER INSERT OR UPDATE OF duration_minutes, evaluation ON public.call_info_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- =============================================
-- STEP 8: Update indexes for better performance with VAPI IDs
-- =============================================
-- Drop old index if exists
DROP INDEX IF EXISTS idx_call_logs_duration_evaluation;
DROP INDEX IF EXISTS idx_call_info_log_duration_evaluation;

-- Create new index optimized for VAPI assistant ID queries
CREATE INDEX IF NOT EXISTS idx_call_info_log_assistant_evaluation ON public.call_info_log(assistant_id, evaluation) 
  WHERE duration_minutes > 0;

-- Create index for date-based queries (usage calculations)
CREATE INDEX IF NOT EXISTS idx_call_info_log_created_at ON public.call_info_log(created_at, assistant_id);

-- =============================================
-- STEP 9: Verification queries
-- =============================================
-- Verify constraints
SELECT 
  'Constraint Check' as test,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.call_info_log'::regclass;

-- Verify foreign key points to correct column
SELECT 
  'Foreign Key Check' as test,
  kcu.column_name as source_column,
  ccu.table_name as target_table,
  ccu.column_name as target_column
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
ON kcu.constraint_name = ccu.constraint_name
WHERE kcu.table_name = 'call_info_log' 
AND kcu.constraint_name LIKE '%assistant_id%';

SELECT 'FINAL FIX COMPLETE - Make.com can now send VAPI assistant IDs directly' as status;