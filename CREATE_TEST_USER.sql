-- Create a test user for development
-- Run this in your Supabase SQL editor

-- Create a test profile directly
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants,
  onboarding_completed
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test@voicematrix.ai',
  'Test User',
  'free',
  'active',
  0,
  10,
  3,
  true
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  subscription_status = 'active';

-- Verify the user was created
SELECT 
  id,
  email,
  full_name,
  subscription_type,
  subscription_status,
  current_usage_minutes,
  max_minutes_monthly,
  max_assistants
FROM public.profiles 
WHERE email = 'test@voicematrix.ai';

-- Also create a test user in auth.users (optional, for complete testing)
-- Note: This requires admin access to auth schema
-- INSERT INTO auth.users (
--   id,
--   instance_id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   is_super_admin,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'authenticated',
--   'authenticated',
--   'test@voicematrix.ai',
--   '$2a$10$placeholder', -- placeholder password hash
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"provider":"email","providers":["email"]}',
--   '{"full_name":"Test User"}',
--   false,
--   '',
--   '',
--   '',
--   ''
-- ) ON CONFLICT (id) DO NOTHING;