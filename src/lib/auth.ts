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

export class SubscriptionError extends Error {
  public statusCode: number
  public details?: Record<string, unknown>
  
  constructor(message: string, statusCode = 402, details?: Record<string, unknown>) {
    super(message)
    this.name = 'SubscriptionError'
    this.statusCode = statusCode
    this.details = details
  }
}

export async function authenticateRequest() {
  console.log('🔐 [AUTH] Starting authentication request');
  
  try {
    const supabase = await createServerSupabaseClient()
    console.log('🔐 [AUTH] Supabase client created');
    
    // Add timeout to auth request
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Authentication timeout')), 10000)
    );
    
    const { data: { user }, error } = await Promise.race([authPromise, timeoutPromise]) as any;
    
    console.log('🔐 [AUTH] Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message
    });
    
    if (error || !user) {
      console.log('🔐 [AUTH] Authentication failed');
      throw new AuthError('Authentication required', 401)
    }

    console.log('🔐 [AUTH] Getting user profile');

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('🔐 [AUTH] Profile error:', profileError);
      
      // If profile doesn't exist (PGRST116 = no rows returned), create one automatically
      if (profileError.code === 'PGRST116') {
        console.log('🔐 [AUTH] No profile found - creating automatic profile for user');
        
        // Create profile automatically
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || 'unknown@example.com',
            full_name: user.user_metadata?.full_name || '',
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
          console.error('❌ [AUTH] Failed to create profile:', createError);
          throw new AuthError('Failed to create user profile', 500);
        }

        console.log('✅ [AUTH] Profile created successfully');
        return {
          user,
          profile: newProfile
        };
      } else {
        // Other profile errors (not missing profile)
        console.error('❌ [AUTH] Profile lookup error:', profileError)
        throw new AuthError('Failed to fetch user profile', 500)
      }
    }

    console.log('🔐 [AUTH] Authentication successful with existing profile');
    return {
      user,
      profile: profile || { 
        id: user.id, 
        email: user.email,
        current_usage_minutes: 0,
        max_minutes_monthly: 10,
        max_assistants: 3
      }
    }
  } catch (error) {
    console.error('❌ [AUTH] Authentication error:', error);
    throw error instanceof AuthError ? error : new AuthError('Authentication failed', 401);
  }
}

// Overloaded function signatures
export async function requirePermission(): Promise<{
  user: any;
  profile: any;
}>;
export async function requirePermission(permission: string): Promise<{
  user: any;
  profile: any;
}>;
export async function requirePermission(userId: string, permission: string): Promise<boolean>;
export async function requirePermission(userIdOrPermission?: string, permission?: string): Promise<any> {
  if (userIdOrPermission && permission) {
    // Old API: return boolean when called with 2 parameters
    // For now, just return true - implement proper permission checking later
    return true
  }
  
  // New API: return user object when called with 0 or 1 parameters
  try {
    const result = await authenticateRequest()
    console.log('🔐 [AUTH] requirePermission successful for user:', result.user.id)
    return result
  } catch (error) {
    console.error('❌ [AUTH] requirePermission failed:', error)
    throw error
  }
}

export async function checkSubscriptionLimits(userId: string, resource: string, count?: number): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get user's current profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('max_assistants')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('❌ [AUTH] Failed to fetch user profile for limits check:', error)
      return false
    }

    // Check limits based on resource type
    if (resource === 'assistants') {
      const { count: currentCount } = await supabase
        .from('user_assistants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('assistant_state', 'deleted')

      const wouldExceedLimit = (currentCount || 0) + (count || 1) > profile.max_assistants
      
      if (wouldExceedLimit) {
        console.log(`🚫 [AUTH] Assistant limit would be exceeded: ${currentCount}/${profile.max_assistants}`)
        return false
      }
      
      console.log(`✅ [AUTH] Assistant limit check passed: ${currentCount}/${profile.max_assistants}`)
      return true
    }
    
    // Minutes checking removed - no longer enforcing minute limits
    if (resource === 'minutes') {
      console.log(`✅ [AUTH] Minutes limit check bypassed - unlimited usage enabled`)
      return true
    }

    // Unknown resource type, allow for now but log
    console.warn(`⚠️ [AUTH] Unknown resource type for limits check: ${resource}`)
    return true
    
  } catch (error) {
    console.error('❌ [AUTH] Error checking subscription limits:', error)
    return false
  }
}

export async function logAuditEvent(params: any) {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Create audit_logs table entry if you have one, otherwise just log
    console.log('Audit event:', params)
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}