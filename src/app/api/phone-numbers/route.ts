import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { validatePinSession } from '@/lib/pin-auth'

/**
 * GET /api/phone-numbers
 * Retrieve assigned phone numbers for PIN-authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    // PIN-based authentication
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const supabase = createServiceRoleClient('get_client_phone_numbers');

    // Use the database function to get client phone numbers
    const { data: phoneNumbers, error } = await supabase
      .rpc('get_client_phone_numbers', { client_id_input: client_id });

    if (error) {
      console.error('[Client Phone Numbers API] Database query error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: phoneNumbers || []
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/phone-numbers - DISABLED: No creation allowed for clients
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: {
      code: 'OPERATION_NOT_ALLOWED',
      message: 'Phone number creation is disabled. Phone numbers are managed by administrators only.'
    }
  }, { status: 403 });
}
