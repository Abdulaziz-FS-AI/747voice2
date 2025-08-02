-- Cleanup script for existing users with profile issues
-- Run this in your Supabase SQL Editor AFTER running the trigger fix

-- First, let's see what auth users exist without profiles
SELECT 
  au.id, 
  au.email, 
  au.created_at as auth_created,
  p.id as profile_id,
  p.created_at as profile_created
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Create missing profiles for existing auth users
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
  onboarding_completed,
  payment_method_type
)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name', 
    au.raw_user_meta_data->>'first_name' || ' ' || au.raw_user_meta_data->>'last_name',
    au.raw_user_meta_data->>'name', 
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'subscription_type', 'free')::text,
  'active',
  0,
  10,
  1,
  NOW(),
  NOW() + INTERVAL '30 days',
  false,
  'none'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Update any profiles missing required fields
UPDATE public.profiles 
SET 
  payment_method_type = 'none'
WHERE payment_method_type IS NULL;

UPDATE public.profiles 
SET 
  subscription_type = 'free'
WHERE subscription_type IS NULL;

UPDATE public.profiles 
SET 
  subscription_status = 'active'
WHERE subscription_status IS NULL;

UPDATE public.profiles 
SET 
  max_minutes_monthly = 10
WHERE max_minutes_monthly IS NULL;

UPDATE public.profiles 
SET 
  max_assistants = 1
WHERE max_assistants IS NULL;

UPDATE public.profiles 
SET 
  current_usage_minutes = 0
WHERE current_usage_minutes IS NULL;

-- Verify all profiles are properly set up
SELECT 
  COUNT(*) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(*) - COUNT(p.id) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;