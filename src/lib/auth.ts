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
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AuthError('Authentication required', 401)
  }

  // Get user profile from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    // If profile doesn't exist, create it
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        onboarding_completed: false
      })
      .select()
      .single()

    if (createError) {
      throw new AuthError('Failed to create user profile', 500)
    }

    return {
      user,
      profile: newProfile
    }
  }

  return {
    user,
    profile: profile || { 
      id: user.id, 
      email: user.email,
      onboarding_completed: false 
    }
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
  return await authenticateRequest()
}

export async function checkSubscriptionLimits(userId: string, resource: string, count?: number) {
  // For now, allow all operations - implement proper subscription limits later
  return true
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