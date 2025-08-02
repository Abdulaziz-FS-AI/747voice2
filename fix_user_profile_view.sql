-- Fix v_user_profile view issue
-- The error shows that v_user_profile is missing a user_id field
-- Based on the schema, profiles table uses 'id' as primary key, not 'user_id'

-- Create or replace the v_user_profile view with the correct field mapping
CREATE OR REPLACE VIEW v_user_profile AS
SELECT 
  id as user_id,  -- Map id to user_id for compatibility
  id,             -- Keep original id field
  email,
  full_name,
  subscription_type,
  subscription_status,
  stripe_customer_id,
  stripe_subscription_id,
  max_assistants,
  max_minutes_monthly,
  current_usage_minutes,
  billing_cycle_start,
  billing_cycle_end,
  last_payment_date,
  next_payment_date,
  payment_method_type,
  paypal_customer_id,
  paypal_subscription_id,
  paypal_payer_id,
  onboarding_completed,
  setup_completed,
  created_at,
  updated_at
FROM profiles;

-- Grant appropriate permissions
GRANT SELECT ON v_user_profile TO authenticated;
GRANT SELECT ON v_user_profile TO service_role;
GRANT SELECT ON v_user_profile TO anon;

-- Alternative: If you prefer to update existing references instead
-- You would need to find where v_user_profile.user_id is being used
-- and change it to v_user_profile.id

-- For webhook/Make.com integration, ensure the webhook payload uses the correct field names
COMMENT ON VIEW v_user_profile IS 'Compatibility view for user profiles with user_id mapping';