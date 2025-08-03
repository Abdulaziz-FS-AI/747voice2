-- Fix the track_usage_and_enforce_limits function that's causing Make.com error
-- This function is called by the track_call_usage trigger

CREATE OR REPLACE FUNCTION public.track_usage_and_enforce_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Since we're removing minute limits, this function can be simplified
  -- Just return NEW without any processing
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: If you want to see what the current function looks like first
-- Run this query to see the function definition:
/*
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'track_usage_and_enforce_limits';
*/

-- If you want to completely remove this trigger since we're not tracking minutes anymore:
/*
DROP TRIGGER IF EXISTS track_call_usage ON public.call_logs;
DROP FUNCTION IF EXISTS public.track_usage_and_enforce_limits() CASCADE;
*/