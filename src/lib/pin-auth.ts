import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export interface PinAuthResult {
  success: boolean;
  client_id?: string;
  company_name?: string;
  session_token?: string;
  error?: string;
}

export interface SessionValidationResult {
  success: boolean;
  client_id?: string;
  company_name?: string;
  expires_at?: string;
  error?: string;
}

/**
 * Authenticate using PIN and create session
 */
export async function authenticatePin(
  pin: string,
  ip?: string,
  userAgent?: string
): Promise<PinAuthResult> {
  try {
    const supabase = createServiceRoleClient('pin_auth');
    
    const { data, error } = await supabase
      .rpc('authenticate_pin', {
        pin_input: pin,
        client_ip: ip,
        client_user_agent: userAgent
      });

    if (error) {
      console.error('[PIN Auth] Database error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Invalid PIN'
      };
    }

    const result = data[0];
    
    if (!result.success) {
      return {
        success: false,
        error: result.error_message || 'Authentication failed'
      };
    }

    return {
      success: true,
      client_id: result.client_id,
      company_name: result.company_name,
      session_token: result.session_token
    };
  } catch (error) {
    console.error('[PIN Auth] Unexpected error:', error);
    return {
      success: false,
      error: 'Authentication service unavailable'
    };
  }
}

/**
 * Validate session token from request headers
 */
export async function validatePinSession(request: NextRequest): Promise<SessionValidationResult> {
  try {
    const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                        request.headers.get('X-Session-Token') ||
                        request.cookies.get('session-token')?.value;

    if (!sessionToken) {
      return {
        success: false,
        error: 'No session token provided'
      };
    }

    const supabase = createServiceRoleClient('session_validation');
    
    const { data, error } = await supabase
      .rpc('validate_session', {
        token_input: sessionToken
      });

    if (error) {
      console.error('[Session Validation] Database error:', error);
      return {
        success: false,
        error: 'Session validation failed'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Invalid session'
      };
    }

    const result = data[0];
    
    if (!result.valid) {
      return {
        success: false,
        error: 'Invalid or expired session'
      };
    }

    return {
      success: true,
      client_id: result.client_id,
      company_name: result.company_name,
      expires_at: result.expires_at
    };
  } catch (error) {
    console.error('[Session Validation] Unexpected error:', error);
    return {
      success: false,
      error: 'Session validation service unavailable'
    };
  }
}

/**
 * Logout session (invalidate token)
 */
export async function logoutSession(sessionToken: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient('session_logout');
    
    const { data, error } = await supabase
      .rpc('logout_session', {
        token_input: sessionToken
      });

    if (error) {
      console.error('[Session Logout] Database error:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('[Session Logout] Unexpected error:', error);
    return false;
  }
}

/**
 * Extract session token from request
 */
export function extractSessionToken(request: NextRequest): string | null {
  return request.headers.get('Authorization')?.replace('Bearer ', '') ||
         request.headers.get('X-Session-Token') ||
         request.cookies.get('session-token')?.value ||
         null;
}

/**
 * Extract client IP from request
 */
export function extractClientIP(request: NextRequest): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.ip ||
         undefined;
}

/**
 * Extract user agent from request
 */
export function extractUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}