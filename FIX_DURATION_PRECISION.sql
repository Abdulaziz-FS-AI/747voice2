-- Fix duration_minutes to store exact decimal values instead of integers
-- This allows storing fractional minutes for short calls (e.g., 0.5 minutes for 30 seconds)

-- STEP 1: Change column type to NUMERIC for exact precision
-- NUMERIC is better than FLOAT8 for financial calculations
ALTER TABLE public.call_info_log 
ALTER COLUMN duration_minutes TYPE NUMERIC(10,4);

-- This gives us:
-- - Up to 10 total digits
-- - 4 decimal places (0.0001 minute precision = 0.006 second precision)
-- - Max value: 999999.9999 minutes (about 16,666 hours)
-- - Examples:
--   * 30 seconds = 0.5000 minutes
--   * 15 seconds = 0.2500 minutes
--   * 1 second = 0.0167 minutes
--   * 90 seconds = 1.5000 minutes

-- STEP 2: Verify the change
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'call_info_log' 
  AND column_name = 'duration_minutes';

-- STEP 3: Test with sample data
-- This should now store exact values
INSERT INTO public.call_info_log (
    assistant_id,
    vapi_call_id,
    duration_minutes,
    evaluation,
    started_at
) VALUES (
    (SELECT id FROM user_assistants LIMIT 1),
    'test-' || gen_random_uuid(),
    0.5,  -- 30 seconds
    'test',
    NOW()
), (
    (SELECT id FROM user_assistants LIMIT 1),
    'test-' || gen_random_uuid(),
    0.25,  -- 15 seconds
    'test',
    NOW()
), (
    (SELECT id FROM user_assistants LIMIT 1),
    'test-' || gen_random_uuid(),
    1.75,  -- 1 minute 45 seconds
    'test',
    NOW()
);

-- STEP 4: Verify exact values are stored
SELECT 
    vapi_call_id,
    duration_minutes,
    duration_minutes * 60 as duration_seconds,
    duration_minutes * 0.10 as cost_dollars
FROM public.call_info_log 
WHERE vapi_call_id LIKE 'test-%'
ORDER BY created_at DESC
LIMIT 3;

-- STEP 5: Clean up test data
DELETE FROM public.call_info_log WHERE vapi_call_id LIKE 'test-%';

-- RESULT: duration_minutes can now store exact decimal values
-- Make.com webhook should send: duration_seconds / 60
-- Analytics will calculate costs accurately for short calls