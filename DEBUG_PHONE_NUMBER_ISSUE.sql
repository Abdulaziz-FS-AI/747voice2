-- =============================================
-- DEBUG PHONE NUMBER CREATION ISSUE
-- =============================================
-- Run these queries to diagnose why phone number creation is failing
-- with "Assistant not found or not owned by user" error
-- =============================================

-- 1. Check if user has any assistants at all
SELECT 
    ua.id,
    ua.user_id,
    ua.name,
    ua.vapi_assistant_id,
    ua.assistant_state,
    ua.created_at,
    p.email
FROM user_assistants ua
JOIN profiles p ON ua.user_id = p.id
WHERE ua.assistant_state = 'active'
ORDER BY ua.created_at DESC;

-- 2. Check for assistants with fallback VAPI IDs
SELECT 
    id,
    name,
    vapi_assistant_id,
    assistant_state,
    user_id
FROM user_assistants
WHERE vapi_assistant_id LIKE 'fallback_%'
   OR vapi_assistant_id IS NULL;

-- 3. Check specific assistant by ID (replace with actual ID from your UI)
-- Use the assistant ID that you're trying to assign to the phone number
SELECT 
    ua.*,
    p.email as user_email
FROM user_assistants ua
JOIN profiles p ON ua.user_id = p.id
WHERE ua.id = 'YOUR_ASSISTANT_ID_HERE';

-- 4. Check if there are any phone numbers already created
SELECT 
    upn.*,
    ua.name as assistant_name,
    p.email as user_email
FROM user_phone_numbers upn
LEFT JOIN user_assistants ua ON upn.assigned_assistant_id = ua.id
JOIN profiles p ON upn.user_id = p.id
ORDER BY upn.created_at DESC;

-- 5. Check the user_phone_numbers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_phone_numbers'
ORDER BY ordinal_position;

-- =============================================
-- POTENTIAL FIXES
-- =============================================

-- Fix 1: If user_phone_numbers table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    phone_number text NOT NULL,
    friendly_name text NOT NULL,
    provider text DEFAULT 'twilio' NOT NULL,
    vapi_phone_id text UNIQUE,
    vapi_credential_id text,
    assigned_assistant_id uuid REFERENCES public.user_assistants(id) ON DELETE SET NULL,
    webhook_url text,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, phone_number)
);

-- Fix 2: Add RLS policies for phone numbers table
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users can view their own phone numbers
CREATE POLICY "Users can view own phone numbers" ON public.user_phone_numbers
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own phone numbers
CREATE POLICY "Users can create own phone numbers" ON public.user_phone_numbers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own phone numbers
CREATE POLICY "Users can update own phone numbers" ON public.user_phone_numbers
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own phone numbers
CREATE POLICY "Users can delete own phone numbers" ON public.user_phone_numbers
    FOR DELETE USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access phone numbers" ON public.user_phone_numbers
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- Fix 3: Grant permissions
GRANT ALL PRIVILEGES ON public.user_phone_numbers TO authenticated, service_role, supabase_admin;

-- Fix 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_assistant_id ON public.user_phone_numbers(assigned_assistant_id);

-- =============================================
-- VERIFICATION
-- =============================================

-- After running the fixes, verify:
-- 1. The user_phone_numbers table exists
-- 2. RLS policies are in place
-- 3. Your user has active assistants with valid VAPI IDs
-- 4. The assistant ID you're using exists and belongs to your user

-- To test, find a valid assistant ID:
SELECT 
    id as assistant_id,
    name,
    vapi_assistant_id,
    'Use this ID when creating phone number' as instruction
FROM user_assistants
WHERE assistant_state = 'active'
  AND vapi_assistant_id IS NOT NULL
  AND vapi_assistant_id NOT LIKE 'fallback_%'
LIMIT 1;