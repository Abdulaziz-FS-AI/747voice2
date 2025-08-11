-- Remove evaluation constraint to allow flexible data types
-- The evaluation column should accept any data: boolean, string, number, etc.

-- STEP 1: Drop trigger that depends on evaluation column
DROP TRIGGER IF EXISTS call_usage_update_trigger ON public.call_info_log;

-- STEP 2: Drop the old constraint (with old table name)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_evaluation_check;

-- Drop the constraint with new table name if it exists  
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_info_log_evaluation_check;

-- STEP 3: Fix foreign key constraint name (still using old table name)
ALTER TABLE public.call_info_log DROP CONSTRAINT IF EXISTS call_logs_assistant_id_fkey;

-- Recreate foreign key with correct name
ALTER TABLE public.call_info_log ADD CONSTRAINT call_info_log_assistant_id_fkey 
FOREIGN KEY (assistant_id) REFERENCES public.user_assistants(id) ON DELETE CASCADE;

-- STEP 4: Change evaluation column to TEXT to accept any data type
ALTER TABLE public.call_info_log ALTER COLUMN evaluation TYPE TEXT;

-- Remove any NOT NULL constraint if present
ALTER TABLE public.call_info_log ALTER COLUMN evaluation DROP NOT NULL;

-- STEP 4: Recreate the trigger with updated function that handles flexible evaluation
CREATE OR REPLACE FUNCTION update_user_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id uuid;
  new_usage NUMERIC;
  evaluation_text TEXT;
BEGIN
  -- Get user_id from assistant
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

-- STEP 5: Recreate trigger with flexible evaluation handling
CREATE TRIGGER call_usage_update_trigger
  AFTER INSERT OR UPDATE OF duration_minutes, evaluation ON public.call_info_log
  FOR EACH ROW
  EXECUTE FUNCTION update_user_usage_on_call();

-- STEP 6: Verify no constraints remain on evaluation column
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.call_info_log'::regclass 
AND pg_get_constraintdef(oid) LIKE '%evaluation%';