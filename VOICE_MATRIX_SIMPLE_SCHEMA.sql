-- ===================================================================
-- VOICE MATRIX - SIMPLIFIED SCHEMA (Supabase Compatible)
-- ===================================================================

-- Just the essential fixes to make assistant creation work

-- 1. Ensure user_assistants has all required columns
DO $$ 
BEGIN
    -- Add config column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'config') THEN
        ALTER TABLE user_assistants ADD COLUMN config jsonb DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add management columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'is_disabled') THEN
        ALTER TABLE user_assistants ADD COLUMN is_disabled boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'disabled_at') THEN
        ALTER TABLE user_assistants ADD COLUMN disabled_at timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'disabled_reason') THEN
        ALTER TABLE user_assistants ADD COLUMN disabled_reason text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'assistant_state') THEN
        ALTER TABLE user_assistants ADD COLUMN assistant_state text DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_assistants' AND column_name = 'original_vapi_config') THEN
        ALTER TABLE user_assistants ADD COLUMN original_vapi_config jsonb;
    END IF;
END $$;

-- 2. Fix user_phone_numbers table
DO $$ 
BEGIN
    -- Add friendly_name column if missing (this was causing the schema cache error!)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_phone_numbers' AND column_name = 'friendly_name') THEN
        ALTER TABLE user_phone_numbers ADD COLUMN friendly_name text;
        -- Copy name to friendly_name for existing records
        UPDATE user_phone_numbers SET friendly_name = name WHERE friendly_name IS NULL;
    END IF;
    
    -- Ensure all expected columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_phone_numbers' AND column_name = 'vapi_credential_id') THEN
        ALTER TABLE user_phone_numbers ADD COLUMN vapi_credential_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_phone_numbers' AND column_name = 'webhook_url') THEN
        ALTER TABLE user_phone_numbers ADD COLUMN webhook_url text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_phone_numbers' AND column_name = 'assigned_at') THEN
        ALTER TABLE user_phone_numbers ADD COLUMN assigned_at timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_phone_numbers' AND column_name = 'notes') THEN
        ALTER TABLE user_phone_numbers ADD COLUMN notes text;
    END IF;
END $$;

-- 3. Fix profiles table to match TypeScript types
DO $$ 
BEGIN
    -- Add subscription fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_type') THEN
        ALTER TABLE profiles ADD COLUMN subscription_type text DEFAULT 'free';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'active';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'billing_cycle_start') THEN
        ALTER TABLE profiles ADD COLUMN billing_cycle_start timestamp with time zone DEFAULT now();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'billing_cycle_end') THEN
        ALTER TABLE profiles ADD COLUMN billing_cycle_end timestamp with time zone DEFAULT (now() + interval '1 month');
    END IF;
    
    -- Payment provider fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id') THEN
        ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'paypal_customer_id') THEN
        ALTER TABLE profiles ADD COLUMN paypal_customer_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'paypal_subscription_id') THEN
        ALTER TABLE profiles ADD COLUMN paypal_subscription_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'paypal_payer_id') THEN
        ALTER TABLE profiles ADD COLUMN paypal_payer_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'payment_method_type') THEN
        ALTER TABLE profiles ADD COLUMN payment_method_type text DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'setup_completed') THEN
        ALTER TABLE profiles ADD COLUMN setup_completed boolean DEFAULT false;
    END IF;
END $$;

-- 4. Make personality column nullable (was causing NOT NULL constraint errors)
ALTER TABLE user_assistants ALTER COLUMN personality DROP NOT NULL;
ALTER TABLE user_assistants ALTER COLUMN personality SET DEFAULT 'professional';

-- 5. Fix RLS policies to prevent permission errors
DROP POLICY IF EXISTS "profiles_all_access" ON profiles;
CREATE POLICY "profiles_all_access" ON profiles
    FOR ALL USING (
        auth.uid() = id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "assistants_all_access" ON user_assistants;
CREATE POLICY "assistants_all_access" ON user_assistants
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "phone_numbers_all_access" ON user_phone_numbers;
CREATE POLICY "phone_numbers_all_access" ON user_phone_numbers
    FOR ALL USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "call_logs_all_access" ON call_logs;
CREATE POLICY "call_logs_all_access" ON call_logs
    FOR ALL USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT user_id FROM user_assistants WHERE id = call_logs.assistant_id
        ) OR
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 6. Essential function for profile creation
CREATE OR REPLACE FUNCTION ensure_user_profile(user_uuid uuid, user_email text, user_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_id uuid;
BEGIN
    SELECT id INTO profile_id FROM profiles WHERE id = user_uuid;
    
    IF profile_id IS NULL THEN
        INSERT INTO profiles (
            id, email, full_name, current_usage_minutes, max_minutes_monthly,
            max_assistants, usage_reset_date, onboarding_completed, setup_completed,
            subscription_type, subscription_status
        ) VALUES (
            user_uuid, user_email, COALESCE(user_name, split_part(user_email, '@', 1)),
            0, 10, 3, CURRENT_DATE, false, false, 'free', 'active'
        ) RETURNING id INTO profile_id;
    END IF;
    
    RETURN profile_id;
END;
$$;

-- 7. Grant permissions to fix access issues
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile(uuid, text, text) TO service_role;

-- 8. Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- 9. Verification
SELECT 'SCHEMA_FIX_COMPLETE' as status, 'Assistant creation should now work' as message;