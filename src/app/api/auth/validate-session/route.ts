import { NextRequest, NextResponse } from 'next/server';
import { validatePinFromRequest } from '@/lib/pin-auth';

/**
 * GET /api/auth/validate-session
 * Validate PIN and return client info - SIMPLIFIED APPROACH
 * Note: This endpoint is kept for backward compatibility but now uses PIN validation
 */
export async function GET(request: NextRequest) {
  try {
    const pinResult = await validatePinFromRequest(request);
    
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PIN', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        client_id: pinResult.client_id,
        company_name: pinResult.company_name,
        authenticated: true
      }
    });
  } catch (error) {
    console.error('[PIN Validation] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'PIN validation failed' }
    }, { status: 500 });
  }
}