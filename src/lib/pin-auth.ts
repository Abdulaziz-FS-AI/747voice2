import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { PinValidationResult } from '@/types/database';

export interface PinAuthResult {
  success: boolean;
  client_id?: string;
  company_name?: string;
  error?: string;
}

/**
 * Validate PIN directly - NO SESSION CREATION
 * This is the simplified approach that validates PIN on each request
 */
export async function validatePin(pin: string): Promise<PinAuthResult> {
  try {
    const supabase = createServiceRoleClient('validate_pin');
    
    const { data, error } = await supabase
      .rpc('validate_pin_simple', {
        pin_input: pin
      });

    if (error) {
      console.error('[PIN Validation] Database error:', error);
      return {
        success: false,
        error: 'PIN validation failed'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Invalid PIN'
      };
    }

    const result = data[0] as PinValidationResult;
    
    if (!result.valid) {
      return {
        success: false,
        error: result.error_message || 'Invalid PIN'
      };
    }

    return {
      success: true,
      client_id: result.client_id!,
      company_name: result.company_name!
    };
  } catch (error) {
    console.error('[PIN Validation] Unexpected error:', error);
    return {
      success: false,
      error: 'PIN validation service unavailable'
    };
  }
}

/**
 * Validate PIN from request headers/body - SIMPLIFIED APPROACH
 * No session tokens, just direct PIN validation per request
 */
export async function validatePinFromRequest(request: NextRequest): Promise<PinAuthResult & { pin?: string }> {
  try {
    // Try to get PIN from different sources
    let pin: string | null = null;

    // 1. From Authorization header (Bearer {PIN})
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      pin = authHeader.substring(7);
    }

    // 2. From X-PIN header
    if (!pin) {
      pin = request.headers.get('X-PIN');
    }

    // 3. From request body (for POST requests)
    if (!pin) {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const body = await request.clone().json();
          pin = body.pin;
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }

    // 4. From query parameters
    if (!pin) {
      const url = new URL(request.url);
      pin = url.searchParams.get('pin');
    }

    if (!pin) {
      return {
        success: false,
        error: 'No PIN provided'
      };
    }

    // Validate PIN format (6 digits)
    if (!/^[0-9]{6}$/.test(pin)) {
      return {
        success: false,
        error: 'PIN must be exactly 6 digits'
      };
    }

    const result = await validatePin(pin);
    return {
      ...result,
      pin: result.success ? pin : undefined
    };
  } catch (error) {
    console.error('[PIN Request Validation] Unexpected error:', error);
    return {
      success: false,
      error: 'PIN validation service unavailable'
    };
  }
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

/**
 * Get client information by ID (for cases where we already have client_id)
 */
export async function getClientById(client_id: string): Promise<{ success: boolean; client?: any; error?: string }> {
  try {
    const supabase = createServiceRoleClient('get_client');
    
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, company_name, contact_email, pin_changed_at, is_active')
      .eq('id', client_id)
      .eq('is_active', true)
      .single();

    if (error || !client) {
      return {
        success: false,
        error: 'Client not found'
      };
    }

    return {
      success: true,
      client: {
        ...client,
        masked_email: client.contact_email ? 
          client.contact_email.replace(/(.{2}).*(@.*)/, '$1***$2') : 
          '***@***.***'
      }
    };
  } catch (error) {
    console.error('[Get Client] Unexpected error:', error);
    return {
      success: false,
      error: 'Client lookup service unavailable'
    };
  }
}

/**
 * Change PIN for a client - SIMPLIFIED VERSION
 */
export async function changePin(
  client_id: string,
  current_pin: string,
  new_pin: string
): Promise<{ success: boolean; message?: string; error?: string; error_code?: string }> {
  try {
    const supabase = createServiceRoleClient('change_pin');
    
    const { data, error } = await supabase
      .rpc('change_pin_simple', {
        client_id_input: client_id,
        current_pin_input: current_pin,
        new_pin_input: new_pin
      });

    if (error) {
      console.error('[PIN Change] Database error:', error);
      return {
        success: false,
        error: 'PIN change failed'
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'PIN change failed'
      };
    }

    const result = data[0];
    
    return {
      success: result.success,
      message: result.message,
      error: result.success ? undefined : result.message,
      error_code: result.error_code || undefined
    };
  } catch (error) {
    console.error('[PIN Change] Unexpected error:', error);
    return {
      success: false,
      error: 'PIN change service unavailable'
    };
  }
}