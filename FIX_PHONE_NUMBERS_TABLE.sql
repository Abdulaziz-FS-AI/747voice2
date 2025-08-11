-- =============================================
-- FIX PHONE NUMBER CREATION - MISSING TABLE
-- =============================================
-- The demo schema is missing the user_phone_numbers table
-- This creates it with proper structure and permissions
-- =============================================

-- Create the missing phone numbers table
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    phone_number text NOT NULL,
    friendly_name text NOT NULL,
    provider text DEFAULT 'twilio' NOT NULL CHECK (provider IN ('twilio', 'vapi')),
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

-- Enable RLS
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own phone numbers" ON public.user_phone_numbers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own phone numbers" ON public.user_phone_numbers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers" ON public.user_phone_numbers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers" ON public.user_phone_numbers
    FOR DELETE USING (auth.uid() = user_id);

-- Service role needs full access
CREATE POLICY "Service role full access phone numbers" ON public.user_phone_numbers
    FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'supabase_admin')
    WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'supabase_admin');

-- Grant permissions
GRANT ALL PRIVILEGES ON public.user_phone_numbers TO authenticated, service_role, supabase_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role, supabase_admin;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON public.user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_assistant_id ON public.user_phone_numbers(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_vapi_phone_id ON public.user_phone_numbers(vapi_phone_id);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- 1. Verify the table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_phone_numbers'
) as table_exists;

-- 2. Check your assistants (find one with a valid VAPI ID)
SELECT 
    id as "Use this ID when creating phone number",
    name as "Assistant Name",
    vapi_assistant_id as "VAPI ID",
    assistant_state as "State",
    CASE 
        WHEN vapi_assistant_id IS NULL THEN '❌ No VAPI ID'
        WHEN vapi_assistant_id LIKE 'fallback_%' THEN '❌ Fallback ID - Create new assistant'
        ELSE '✅ Valid VAPI ID'
    END as "Status"
FROM user_assistants
WHERE assistant_state = 'active'
ORDER BY created_at DESC;

-- 3. If all assistants have fallback IDs, you need to create a new assistant
-- The fallback IDs were created when VAPI was unavailable

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
-- ✅ Phone numbers table created
-- ✅ RLS policies configured
-- ✅ Permissions granted
-- ✅ Indexes created for performance
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase dashboard
-- 2. Check your assistants - ensure at least one has a valid VAPI ID
-- 3. If all have fallback IDs, create a new assistant first
-- 4. Then try creating a phone number again
-- =============================================