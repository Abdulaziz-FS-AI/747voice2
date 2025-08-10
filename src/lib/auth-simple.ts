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
  
  // ATTEMPT 1: Check if we can create a real user in the database first
  const supabase = createServiceRoleClient('auth_simple_test');
  
  // Try to get or create a test user
  let testUserId = '00000000-0000-0000-0000-000000000001';
  
  // Check if user exists in database
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single();
  
  if (existingProfile) {
    console.log('🔐 [SIMPLE-AUTH] Found existing test profile, using it');
    return {
      user: {
        id: testUserId,
        email: existingProfile.email,
        user_metadata: { full_name: existingProfile.full_name }
      },
      profile: existingProfile
    };
  }
  
  // If no profile exists, let the API create it
  console.log('🔐 [SIMPLE-AUTH] No existing profile, letting API create one');
  
  const testUser = {
    id: testUserId,
    email: 'test@voicematrix.ai',
    user_metadata: {
      full_name: 'Test User'
    }
  };
  
  return {
    user: testUser,
    profile: null  // Let the API create the profile
  };
}