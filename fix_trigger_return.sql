-- Fix for Make.com trigger error: "control reached end of trigger procedure without RETURN"
-- This finds and fixes any trigger functions missing RETURN statements

-- 1. Check the current handle_new_user function
-- This function is called when new users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the profile
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name,
      subscription_type,
      subscription_status,
      current_usage_minutes,
      max_minutes_monthly,
      max_assistants,
      billing_cycle_start,
      billing_cycle_end,
      setup_completed
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name',
        CONCAT(
          NEW.raw_user_meta_data->>'first_name', 
          ' ', 
          NEW.raw_user_meta_data->>'last_name'
        ),
        split_part(NEW.email, '@', 1)
      ),
      COALESCE(NEW.raw_user_meta_data->>'subscription_type', 'free'),
      'active', 
      0,
      CASE 
        WHEN NEW.raw_user_meta_data->>'subscription_type' = 'pro' THEN 100
        ELSE 10
      END,
      CASE 
        WHEN NEW.raw_user_meta_data->>'subscription_type' = 'pro' THEN 10
        ELSE 1
      END,
      NOW(),
      NOW() + INTERVAL '30 days',
      COALESCE((NEW.raw_user_meta_data->>'setup_completed')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  END;
  
  -- ALWAYS return NEW to complete the trigger
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Check if there are any other trigger functions that might be missing RETURN
-- List all trigger functions for inspection
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prorettype = 'trigger'::regtype::oid
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n.nspname, p.proname;