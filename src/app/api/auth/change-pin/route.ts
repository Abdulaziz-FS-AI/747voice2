import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { validatePinSession } from '@/lib/pin-auth';

const changePinSchema = z.object({
  currentPin: z.string().regex(/^[0-9]{6,8}$/, 'Current PIN must be 6-8 digits'),
  newPin: z.string().regex(/^[0-9]{6,8}$/, 'New PIN must be 6-8 digits'),
  email: z.string().email('Valid email required for verification')
});

/**
 * POST /api/auth/change-pin
 * Change client PIN with email verification
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const body = await request.json();
    const { currentPin, newPin, email } = changePinSchema.parse(body);
    
    console.log('[PIN Change] Request from client:', client_id);

    const supabase = createServiceRoleClient('change_pin');

    // First verify the email matches the client's email
    const { data: clientInfo, error: clientError } = await supabase
      .rpc('get_client_info', { client_id_input: client_id });

    if (clientError || !clientInfo || clientInfo.length === 0) {
      console.error('[PIN Change] Failed to get client info:', clientError);
      return NextResponse.json({
        success: false,
        error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' }
      }, { status: 404 });
    }

    const client = clientInfo[0];
    
    // Verify email matches
    if (client.contact_email.toLowerCase() !== email.toLowerCase()) {
      console.log('[PIN Change] Email mismatch for client:', client_id);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'EMAIL_MISMATCH', 
          message: 'Email does not match your account. Please contact administrator.' 
        }
      }, { status: 400 });
    }

    // Attempt PIN change
    const { data: changeResult, error: changeError } = await supabase
      .rpc('change_pin', {
        client_id_input: client_id,
        current_pin_input: currentPin,
        new_pin_input: newPin
      });

    if (changeError) {
      console.error('[PIN Change] Database error:', changeError);
      throw changeError;
    }

    if (!changeResult || changeResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'CHANGE_FAILED', message: 'PIN change failed' }
      }, { status: 500 });
    }

    const result = changeResult[0];
    
    if (!result.success) {
      console.log('[PIN Change] Failed:', result.error_code, result.message);
      return NextResponse.json({
        success: false,
        error: { 
          code: result.error_code || 'CHANGE_FAILED', 
          message: result.message 
        }
      }, { status: 400 });
    }

    console.log('[PIN Change] Successful for client:', client_id);

    // Clear the session cookie since all sessions are invalidated
    const response = NextResponse.json({
      success: true,
      message: result.message,
      data: {
        pin_changed_at: new Date().toISOString(),
        sessions_invalidated: true
      }
    });

    // Clear session cookie
    response.cookies.delete('session-token');

    return response;
  } catch (error) {
    console.error('[PIN Change] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        }
      }, { status: 400 });
    }
    
    return handleAPIError(error);
  }
}

/**
 * GET /api/auth/change-pin
 * Get client info for PIN change form
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const supabase = createServiceRoleClient('get_client_info');

    const { data: clientInfo, error } = await supabase
      .rpc('get_client_info', { client_id_input: client_id });

    if (error || !clientInfo || clientInfo.length === 0) {
      console.error('[PIN Change Info] Failed to get client info:', error);
      return NextResponse.json({
        success: false,
        error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' }
      }, { status: 404 });
    }

    const client = clientInfo[0];

    return NextResponse.json({
      success: true,
      data: {
        company_name: client.company_name,
        contact_email: client.contact_email,
        pin_changed_at: client.pin_changed_at,
        masked_email: client.contact_email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      }
    });
  } catch (error) {
    console.error('[PIN Change Info] Error:', error);
    return handleAPIError(error);
  }
}