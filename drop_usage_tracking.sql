-- Drop the usage tracking trigger and function that's causing Make.com errors
-- Since we're removing minute limits, we don't need this anymore

-- 1. Drop the trigger first
DROP TRIGGER IF EXISTS track_call_usage ON public.call_logs;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.track_usage_and_enforce_limits() CASCADE;

-- 3. Also drop the auto_track_usage_on_call if it exists
DROP TRIGGER IF EXISTS trigger_track_usage_on_call ON public.call_logs;
DROP TRIGGER IF EXISTS trigger_track_usage_on_call_update ON public.call_logs;
DROP FUNCTION IF EXISTS public.auto_track_usage_on_call() CASCADE;

-- 4. Drop the track_call_usage function as well since we're not tracking usage
DROP FUNCTION IF EXISTS public.track_call_usage(UUID, INTEGER, UUID) CASCADE;

-- Verify the triggers have been removed
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.call_logs'::regclass
ORDER BY tgname;