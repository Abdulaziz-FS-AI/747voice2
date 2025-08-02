-- Fix v_user_profile view to ensure user_id column exists
-- This fixes the Make.com webhook error: "record v_user_profile has no field user_id"

-- Drop the existing view completely
DROP VIEW IF EXISTS public.v_user_profile CASCADE;

-- Recreate the view with explicit user_id column for Make.com compatibility
CREATE VIEW public.v_user_profile AS
SELECT 
  p.id as user_id,  -- IMPORTANT: Make.com expects this field name
  p.id,
  p.email,
  p.full_name,
  p.subscription_type,
  p.subscription_status,
  p.max_assistants,
  p.max_minutes_monthly,
  p.current_usage_minutes,
  p.billing_cycle_start,
  p.billing_cycle_end,
  p.created_at,
  p.updated_at,
  -- Calculate remaining minutes
  (p.max_minutes_monthly - COALESCE(p.current_usage_minutes, 0)) as remaining_minutes,
  -- Calculate usage percentage
  CASE 
    WHEN p.max_minutes_monthly > 0 THEN 
      ROUND((COALESCE(p.current_usage_minutes, 0)::numeric / p.max_minutes_monthly::numeric) * 100, 2)
    ELSE 0
  END as usage_percentage,
  -- Check if over limit
  (COALESCE(p.current_usage_minutes, 0) >= p.max_minutes_monthly) as is_over_limit
FROM profiles p;

-- Grant permissions
GRANT SELECT ON public.v_user_profile TO authenticated;
GRANT SELECT ON public.v_user_profile TO service_role;
GRANT SELECT ON public.v_user_profile TO anon;

-- Verify the view has the correct columns
COMMENT ON VIEW public.v_user_profile IS 
'User profile view for Make.com webhook compatibility. MUST include user_id column mapped from profiles.id';

-- Create a function to test the view structure
CREATE OR REPLACE FUNCTION public.verify_user_profile_view()
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    attname::text as column_name,
    format_type(atttypid, atttypmod) as data_type,
    CASE WHEN attnotnull THEN 'NO' ELSE 'YES' END as is_nullable
  FROM pg_attribute
  WHERE attrelid = 'public.v_user_profile'::regclass
    AND attnum > 0
    AND NOT attisdropped
  ORDER BY attnum;
END;
$$ LANGUAGE plpgsql;

-- Test query to verify user_id exists (for debugging)
DO $$
DECLARE
  has_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_attribute 
    WHERE attrelid = 'public.v_user_profile'::regclass 
      AND attname = 'user_id'
      AND NOT attisdropped
  ) INTO has_user_id;
  
  IF NOT has_user_id THEN
    RAISE EXCEPTION 'v_user_profile view is missing user_id column!';
  ELSE
    RAISE NOTICE 'v_user_profile view has user_id column - OK';
  END IF;
END;
$$;