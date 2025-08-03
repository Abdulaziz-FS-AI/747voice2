# VOICE MATRIX - MASTER FIX PLAN
## Complete Solution for Authentication Issues

### PHASE 1: EMERGENCY DATABASE FIX (DO FIRST)

#### Step 1.1: Fix Schema Immediately
```sql
-- Run this in Supabase SQL Editor FIRST
-- File: EMERGENCY_SCHEMA_FIX.sql

-- 1. Add missing columns that code expects
ALTER TABLE user_assistants ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE user_assistants ADD COLUMN IF NOT EXISTS assistant_state TEXT DEFAULT 'active';
ALTER TABLE user_assistants ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false;

-- 2. Make personality nullable (code doesn't always provide it)
ALTER TABLE user_assistants ALTER COLUMN personality DROP NOT NULL;
ALTER TABLE user_assistants ALTER COLUMN personality SET DEFAULT 'professional';

-- 3. Migrate existing data to config format
UPDATE user_assistants 
SET config = jsonb_build_object(
    'personality', COALESCE(personality, 'professional'),
    'call_objective', call_objective,
    'voice', voice,
    'model', model,
    'provider', provider
)
WHERE config = '{}' OR config IS NULL;

-- 4. Add foreign key constraint if missing
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Create proper profile creation function
CREATE OR REPLACE FUNCTION public.ensure_user_profile_v2(
    user_uuid uuid,
    user_email text,
    user_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_id uuid;
BEGIN
    -- Upsert profile to handle race conditions
    INSERT INTO public.profiles (
        id, email, full_name, subscription_type, subscription_status,
        current_usage_minutes, max_minutes_monthly, max_assistants,
        onboarding_completed, setup_completed, payment_method_type
    ) VALUES (
        user_uuid, user_email, COALESCE(user_name, split_part(user_email, '@', 1)),
        'free', 'active', 0, 10, 3, false, false, 'none'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = now()
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$;

-- 6. Fix RLS policies (temporarily disable problematic ones)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- Create permissive policies
CREATE POLICY "profiles_full_access" ON profiles
FOR ALL USING (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "assistants_full_access" ON user_assistants
FOR ALL USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'service_role'
);

SELECT 'EMERGENCY_SCHEMA_FIX_COMPLETE' as status;
```

#### Step 1.2: Fix All Existing Users
```sql
-- Fix users without profiles
INSERT INTO public.profiles (
    id, email, full_name, subscription_type, subscription_status,
    current_usage_minutes, max_minutes_monthly, max_assistants,
    onboarding_completed, setup_completed, payment_method_type
)
SELECT 
    u.id, u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'free', 'active', 0, 10, 3, false, false, 'none'
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### PHASE 2: CODE FIXES

#### Step 2.1: Fix Authentication Flow
```typescript
// src/lib/auth-v2.ts (NEW FILE)
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase'

export class AuthError extends Error {
  constructor(message: string, public statusCode = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function authenticateRequestV2() {
  try {
    // 1. Get user from session (user context)
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new AuthError('Authentication required. Please log in again.')
    }

    // 2. Get profile using service role (bypass RLS issues)
    const serviceSupabase = createServiceRoleClient('profile_lookup')
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError?.code === 'PGRST116') {
      // Create profile using service role
      const { data: newProfile, error: createError } = await serviceSupabase
        .rpc('ensure_user_profile_v2', {
          user_uuid: user.id,
          user_email: user.email || 'unknown@example.com',
          user_name: user.user_metadata?.full_name || null
        })

      if (createError) {
        console.error('Profile creation failed:', createError)
        throw new AuthError('Failed to create user profile', 500)
      }

      // Fetch the created profile
      const { data: createdProfile } = await serviceSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return { user, profile: createdProfile }
    }

    if (profileError) {
      console.error('Profile lookup failed:', profileError)
      throw new AuthError('Failed to fetch user profile', 500)
    }

    return { user, profile }
  } catch (error) {
    console.error('Authentication error:', error)
    throw error instanceof AuthError ? error : new AuthError('Authentication failed')
  }
}
```

#### Step 2.2: Fix Assistant Creation API
```typescript
// src/app/api/assistants/route.ts (REPLACE authenticateRequest with authenticateRequestV2)
import { authenticateRequestV2 } from '@/lib/auth-v2'

export async function POST(request: NextRequest) {
  try {
    // Use new authentication
    const { user, profile } = await authenticateRequestV2()
    
    const body = await request.json()
    const validatedData = CreateAssistantSchema.parse(body)
    
    // Check limits
    const serviceSupabase = createServiceRoleClient('assistant_creation')
    const { count: currentCount } = await serviceSupabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('assistant_state', 'deleted')

    if ((currentCount || 0) >= profile.max_assistants) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `You have reached your limit of ${profile.max_assistants} assistants`
        }
      }, { status: 403 })
    }

    // Create assistant with service role (bypass RLS)
    const assistantData = {
      user_id: user.id,
      name: validatedData.name,
      config: {
        personality: validatedData.personality || 'professional',
        call_objective: validatedData.call_objective || '',
        model: validatedData.model || 'gpt-4o-mini',
        voice: validatedData.voice || 'rachel',
        ...validatedData.config
      },
      template_id: validatedData.template_id || null
    }

    const { data: assistant, error: createError } = await serviceSupabase
      .from('user_assistants')
      .insert(assistantData)
      .select()
      .single()

    if (createError) {
      console.error('Assistant creation failed:', createError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: 'Failed to create assistant'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: assistant
    }, { status: 201 })

  } catch (error) {
    console.error('Assistant creation error:', error)
    
    if (error instanceof AuthError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: error.message
        }
      }, { status: error.statusCode })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    }, { status: 500 })
  }
}
```

### PHASE 3: SESSION FIXES

#### Step 3.1: Improve Cookie Handling
```typescript
// src/lib/supabase.ts (UPDATE)
export async function createServerSupabaseClient() {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            try {
              return cookieStore.get(name)?.value
            } catch (error) {
              console.warn('Cookie access failed:', name)
              return undefined
            }
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Expected in Server Components - don't log as error
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Expected in Server Components - don't log as error
            }
          }
        }
      }
    )
  } catch (error) {
    console.error('Failed to create server Supabase client:', error)
    throw new Error('Supabase client initialization failed')
  }
}
```

### PHASE 4: TESTING

#### Step 4.1: Test Authentication
```bash
# Test the API endpoints
curl -X POST http://localhost:3000/api/assistants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Assistant", "personality": "professional"}'
```

#### Step 4.2: Verify Database
```sql
-- Check that profiles exist for all users
SELECT 
  'VERIFICATION' as check_type,
  COUNT(u.id) as total_users,
  COUNT(p.id) as users_with_profiles,
  COUNT(u.id) - COUNT(p.id) as missing_profiles
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;
```

### EXECUTION ORDER (CRITICAL)

1. **FIRST**: Run Emergency Schema Fix SQL in Supabase
2. **SECOND**: Deploy code changes (auth-v2.ts, updated API routes)
3. **THIRD**: Test authentication flow
4. **FOURTH**: Clear browser sessions and test fresh login
5. **FIFTH**: Test assistant creation

### SUCCESS CRITERIA

- ✅ Users can log in without authentication errors
- ✅ Assistant creation works immediately after login
- ✅ No "Authentication required" errors in console
- ✅ Profiles created automatically for new users
- ✅ Session persists across page refreshes

This plan addresses ALL identified issues systematically and provides a clear path to a working authentication system.