// SIMPLE AUTH BYPASS - For immediate testing
import { createServiceRoleClient } from '@/lib/supabase';

export class AuthError extends Error {
  public statusCode: number;
  public code: string;
  
  constructor(message: string, code: string = 'AUTH_ERROR', statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// HARDCODED auth for immediate testing
export async function requireAuth(): Promise<{ user: any; profile: any }> {
  console.log('🔐 [SIMPLE-AUTH] Using hardcoded auth for testing');
  
  const supabase = createServiceRoleClient('auth_simple_test');
  const testEmail = 'test@voicematrix.ai';
  
  // First, try to find an existing user by email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === testEmail);
  
  let userId: string;
  
  if (existingUser) {
    console.log('🔐 [SIMPLE-AUTH] Found existing auth user:', existingUser.id);
    userId = existingUser.id;
  } else {
    // Create a real user in auth.users table
    console.log('🔐 [SIMPLE-AUTH] Creating new auth user');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test-demo-password-2024',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Demo User'
      }
    });
    
    if (createError) {
      console.error('🔐 [SIMPLE-AUTH] Failed to create auth user:', createError);
      throw new AuthError('Failed to create test user');
    }
    
    userId = newUser.user.id;
    console.log('🔐 [SIMPLE-AUTH] Created auth user:', userId);
  }
  
  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (existingProfile) {
    console.log('🔐 [SIMPLE-AUTH] Found existing profile');
    return {
      user: {
        id: userId,
        email: testEmail,
        user_metadata: { full_name: existingProfile.full_name }
      },
      profile: existingProfile
    };
  }
  
  // Profile doesn't exist, let the API create it
  console.log('🔐 [SIMPLE-AUTH] No profile found, will be created by API');
  
  return {
    user: {
      id: userId,
      email: testEmail,
      user_metadata: {
        full_name: 'Test Demo User'
      }
    },
    profile: null
  };
}