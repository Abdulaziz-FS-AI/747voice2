import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors';
import { authenticatePin, extractClientIP, extractUserAgent } from '@/lib/pin-auth';

const pinLoginSchema = z.object({
  pin: z.string().regex(/^[0-9]{6,8}$/, 'PIN must be 6-8 digits')
});

/**
 * POST /api/auth/pin-login
 * Authenticate client using PIN and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = pinLoginSchema.parse(body);
    
    const clientIP = extractClientIP(request);
    const userAgent = extractUserAgent(request);
    
    console.log('[PIN Login] Authentication attempt:', {
      pin: pin.replace(/./g, '*'),
      ip: clientIP,
      userAgent: userAgent?.substring(0, 50) + '...'
    });

    const authResult = await authenticatePin(pin, clientIP, userAgent);
    
    if (!authResult.success) {
      console.log('[PIN Login] Authentication failed:', authResult.error);
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: authResult.error || 'Invalid PIN'
        }
      }, { status: 401 });
    }

    console.log('[PIN Login] Authentication successful for:', authResult.company_name);

    const response = NextResponse.json({
      success: true,
      data: {
        client_id: authResult.client_id,
        company_name: authResult.company_name,
        session_token: authResult.session_token,
        authenticated: true
      },
      message: `Welcome, ${authResult.company_name}!`
    });

    // Set session token as httpOnly cookie for security
    if (authResult.session_token) {
      response.cookies.set('session-token', authResult.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });
    }
    
    return response;
  } catch (error) {
    console.error('[PIN Login] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid PIN format',
          details: error.issues
        }
      }, { status: 400 });
    }
    
    return handleAPIError(error);
  }
}

/**
 * DELETE /api/auth/pin-login
 * Logout (invalidate session)
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                        request.headers.get('X-Session-Token') ||
                        request.cookies.get('session-token')?.value;

    if (!sessionToken) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_SESSION',
          message: 'No session to logout'
        }
      }, { status: 400 });
    }

    // TODO: Implement session invalidation using logoutSession function
    console.log('[PIN Logout] Session logout requested');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('[PIN Logout] Error:', error);
    return handleAPIError(error);
  }
}