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
  
  // Create a hardcoded test user
  const testUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@voicematrix.ai',
    user_metadata: {
      full_name: 'Test User'
    }
  };
  
  const testProfile = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@voicematrix.ai',
    full_name: 'Test User',
    subscription_type: 'free',
    subscription_status: 'active',
    current_usage_minutes: 0,
    max_minutes_monthly: 10,
    max_assistants: 3,
    onboarding_completed: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log('🔐 [SIMPLE-AUTH] Using hardcoded test user for development');
  
  return {
    user: testUser,
    profile: testProfile
  };
}