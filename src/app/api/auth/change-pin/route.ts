import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors';
import { validatePinFromRequest, getClientById, changePin } from '@/lib/pin-auth';

const changePinSchema = z.object({
  currentPin: z.string().regex(/^[0-9]{6}$/, 'Current PIN must be exactly 6 digits'),
  newPin: z.string().regex(/^[0-9]{6}$/, 'New PIN must be exactly 6 digits'),
  email: z.string().email('Valid email is required')
});

/**
 * GET /api/auth/change-pin
 * Get client settings - SIMPLIFIED (requires PIN auth)
 */
export async function GET(request: NextRequest) {
  try {
    // SIMPLIFIED PIN-based authentication (no sessions)
    const pinResult = await validatePinFromRequest(request);
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 });
    }

    const { client_id } = pinResult;
    
    // Get client information
    const clientResult = await getClientById(client_id);
    if (!clientResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'CLIENT_NOT_FOUND', message: clientResult.error || 'Client not found' }
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: clientResult.client
    });

  } catch (error) {
    console.error('[Change PIN GET] Error:', error);
    return handleAPIError(error);
  }
}

/**
 * POST /api/auth/change-pin
 * Change PIN - SIMPLIFIED (requires current PIN auth)
 */
export async function POST(request: NextRequest) {
  try {
    // SIMPLIFIED PIN-based authentication (no sessions)
    const pinResult = await validatePinFromRequest(request);
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 });
    }

    const { client_id } = pinResult;
    const body = await request.json();
    const { currentPin, newPin, email } = changePinSchema.parse(body);

    // Get client info to verify email
    const clientResult = await getClientById(client_id);
    if (!clientResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' }
      }, { status: 404 });
    }

    // Verify email matches
    if (clientResult.client.contact_email !== email) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'EMAIL_MISMATCH', 
          message: 'Email does not match account email' 
        }
      }, { status: 400 });
    }

    // Change PIN using simplified function
    const changeResult = await changePin(client_id, currentPin, newPin);
    
    if (!changeResult.success) {
      return NextResponse.json({
        success: false,
        error: { 
          code: changeResult.error_code || 'PIN_CHANGE_FAILED', 
          message: changeResult.error || 'Failed to change PIN' 
        }
      }, { status: 400 });
    }

    console.log(`[PIN Change] Successfully changed PIN for client: ${client_id}`);

    return NextResponse.json({
      success: true,
      message: changeResult.message || 'PIN changed successfully'
    });

  } catch (error) {
    console.error('[Change PIN POST] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input format',
          details: error.issues
        }
      }, { status: 400 });
    }
    
    return handleAPIError(error);
  }
}