-- Minimal usage limit enforcement additions
-- Only adds what's essential for the limit system

-- Add limit enforcement tracking column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS limit_enforced_at TIMESTAMP WITH TIME ZONE;

-- Essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id_created ON public.call_logs(user_id, created_at) 
WHERE user_id IS NOT NULL;

-- Trigger to ensure call_logs has user_id for usage calculations
CREATE OR REPLACE FUNCTION public.update_call_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT ua.user_id INTO NEW.user_id
  FROM public.user_assistants ua
  WHERE ua.id = NEW.assistant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_call_log_user_id ON public.call_logs;
CREATE TRIGGER set_call_log_user_id
  BEFORE INSERT ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_log_user_id();

-- Backfill existing call_logs
UPDATE public.call_logs 
SET user_id = (
  SELECT ua.user_id 
  FROM public.user_assistants ua 
  WHERE ua.id = call_logs.assistant_id
)
WHERE user_id IS NULL AND assistant_id IS NOT NULL;

-- Verify deployment
SELECT 
  'LIMIT_SETUP_CHECK' as status,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'limit_enforced_at') as has_limit_column,
  EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'set_call_log_user_id') as has_trigger,
  (SELECT COUNT(*) FROM public.call_logs WHERE user_id IS NULL) as missing_user_ids;