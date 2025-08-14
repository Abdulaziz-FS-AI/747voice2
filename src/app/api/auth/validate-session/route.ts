import { NextRequest, NextResponse } from 'next/server';
import { validatePinSession } from '@/lib/pin-auth';

/**
 * GET /api/auth/validate-session
 * Validate session token and return client info
 */
export async function GET(request: NextRequest) {
  try {
    const sessionResult = await validatePinSession(request);
    
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_SESSION', message: 'Session invalid or expired' }
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        client_id: sessionResult.client_id,
        company_name: sessionResult.company_name,
        expires_at: sessionResult.expires_at
      }
    });
  } catch (error) {
    console.error('[Session Validation] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Session validation failed' }
    }, { status: 500 });
  }
}