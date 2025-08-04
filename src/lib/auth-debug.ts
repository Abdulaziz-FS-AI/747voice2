// DEBUG: Enhanced authentication with better error handling
import { createServerSupabaseClient } from '@/lib/supabase'

export class AuthError extends Error {
  public statusCode: number
  public details?: Record<string, unknown>
  
  constructor(message: string, statusCode = 401, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
    this.details = details
  }
}

export async function authenticateRequestDebug() {
  console.log('🔐 [AUTH-DEBUG] Starting enhanced authentication');
  
  try {
    const supabase = await createServerSupabaseClient()
    console.log('🔐 [AUTH-DEBUG] Supabase client created');
    
    // Step 1: Check for session tokens in cookies
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;
    
    console.log('🔐 [AUTH-DEBUG] Cookie check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });
    
    // Step 2: Try to get user with extended timeout
    console.log('🔐 [AUTH-DEBUG] Attempting to get user...');
    
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout after 30s')), 30000)
    );
    
    const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]) as any;
    
    console.log('🔐 [AUTH-DEBUG] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: error?.message,
      errorCode: error?.code
    });
    
    if (error) {
      console.log('🔐 [AUTH-DEBUG] Auth error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      throw new AuthError(`Authentication failed: ${error.message}`, 401, { 
        originalError: error,
        hasTokens: !!accessToken && !!refreshToken
      });
    }
    
    if (!user) {
      console.log('🔐 [AUTH-DEBUG] No user found');
      throw new AuthError('No authenticated user found', 401, {
        hasTokens: !!accessToken && !!refreshToken
      });
    }

    console.log('🔐 [AUTH-DEBUG] User authenticated successfully:', user.id);

    // Step 3: Get user profile with better error handling
    console.log('🔐 [AUTH-DEBUG] Getting user profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('🔐 [AUTH-DEBUG] Profile query result:', {
      hasProfile: !!profile,
      profileError: profileError?.message,
      profileErrorCode: profileError?.code
    });

    if (profileError) {
      console.log('🔐 [AUTH-DEBUG] Profile error details:', profileError);
      
      // If profile doesn't exist (PGRST116 = no rows returned), create one
      if (profileError.code === 'PGRST116') {
        console.log('🔐 [AUTH-DEBUG] Creating missing profile...');
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || 'unknown@example.com',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            subscription_type: 'free',
            subscription_status: 'active',
            current_usage_minutes: 0,
            max_minutes_monthly: 10,
            max_assistants: 3,
            onboarding_completed: false
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ [AUTH-DEBUG] Failed to create profile:', createError);
          throw new AuthError('Failed to create user profile', 500, { 
            originalError: createError,
            userId: user.id
          });
        }

        console.log('✅ [AUTH-DEBUG] Profile created successfully');
        return {
          user,
          profile: newProfile
        };
      } else {
        console.error('❌ [AUTH-DEBUG] Profile lookup error:', profileError);
        throw new AuthError('Failed to fetch user profile', 500, { 
          originalError: profileError,
          userId: user.id
        });
      }
    }

    console.log('✅ [AUTH-DEBUG] Authentication completed successfully');
    return {
      user,
      profile
    };

  } catch (error) {
    console.error('❌ [AUTH-DEBUG] Authentication failed:', error);
    
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError('Authentication system error', 500, { 
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
}

// Simple auth check without profile lookup
export async function simpleAuthCheck() {
  console.log('🔐 [SIMPLE-AUTH] Starting simple auth check');
  
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('🔐 [SIMPLE-AUTH] Result:', {
      success: !!user && !error,
      hasUser: !!user,
      userId: user?.id,
      error: error?.message
    });
    
    if (error || !user) {
      throw new AuthError('Simple auth failed', 401);
    }
    
    return { user };
  } catch (error) {
    console.error('❌ [SIMPLE-AUTH] Failed:', error);
    throw error;
  }
}