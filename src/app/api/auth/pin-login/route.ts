import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors';
import { authenticatePin, logoutSession, extractClientIP, extractUserAgent } from '@/lib/pin-auth';

// Rate limiting store (in production, use Redis/KV store)
const rateLimitStore = new Map<string, { attempts: number, lastAttempt: number, lockedUntil?: number }>()

// Enhanced PIN validation with security checks
const pinLoginSchema = z.object({
  pin: z.string().regex(/^[0-9]{6,8}$/, 'PIN must be 6-8 digits')
    .refine(pin => {
      // Check for weak patterns
      const weakPatterns = [
        /^(\d)\1+$/, // All same digit (111111)
        /^123456|^654321/, // Sequential
        /^000000|^999999/ // Common patterns
      ]
      return !weakPatterns.some(pattern => pattern.test(pin))
    }, 'PIN is too weak. Avoid patterns like 111111 or 123456')
});

/**
 * POST /api/auth/pin-login
 * Authenticate client using PIN and create session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = pinLoginSchema.parse(body);
    
    const clientIP = extractClientIP(request) || 'unknown';
    const userAgent = extractUserAgent(request);
    
    // Rate limiting check
    const rateLimitKey = `pin_attempts:${clientIP}`;
    const attempts = rateLimitStore.get(rateLimitKey);
    const now = Date.now();
    
    if (attempts) {
      // Check if IP is locked
      if (attempts.lockedUntil && now < attempts.lockedUntil) {
        const remainingMinutes = Math.ceil((attempts.lockedUntil - now) / 1000 / 60);
        console.warn(`[PIN Auth] Rate limited IP: ${clientIP}`);
        return NextResponse.json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Too many failed attempts. Try again in ${remainingMinutes} minutes`
          }
        }, { status: 429 });
      }
      
      // Reset if enough time has passed (15 minutes)
      if (now - attempts.lastAttempt > 900000) {
        rateLimitStore.delete(rateLimitKey);
      }
    }
    
    console.log('[PIN Login] Authentication attempt:', {
      pin: pin.replace(/./g, '*'),
      ip: clientIP,
      userAgent: userAgent?.substring(0, 50) + '...'
    });

    const authResult = await authenticatePin(pin, clientIP, userAgent);
    
    if (!authResult.success) {
      // Track failed attempts
      const currentAttempts = rateLimitStore.get(rateLimitKey) || { attempts: 0, lastAttempt: 0 };
      currentAttempts.attempts += 1;
      currentAttempts.lastAttempt = now;
      
      // Lock IP after 5 failed attempts for 30 minutes
      if (currentAttempts.attempts >= 5) {
        currentAttempts.lockedUntil = now + (30 * 60 * 1000);
        console.warn(`[PIN Auth] IP ${clientIP} locked after 5 failed attempts`);
      }
      
      rateLimitStore.set(rateLimitKey, currentAttempts);
      
      console.warn(`[PIN Login] Failed attempt ${currentAttempts.attempts}/5 from IP: ${clientIP}`);
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid PIN'
        }
      }, { status: 401 });
    }

    // Reset rate limiting on successful login
    rateLimitStore.delete(rateLimitKey);
    
    console.log(`[PIN Login] Successful authentication for ${authResult.company_name} from IP: ${clientIP}`);

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

    // Set session token as httpOnly cookie with reduced duration
    if (authResult.session_token) {
      response.cookies.set('session-token', authResult.session_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 4 * 60 * 60, // Reduced to 4 hours for security
        path: '/'
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

    // FIXED: Actually invalidate the session
    const logoutSuccess = await logoutSession(sessionToken);
    
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      sessionInvalidated: logoutSuccess
    });
    
    // Clear the cookie
    response.cookies.set('session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
    
    console.log(`[PIN Logout] Session logout completed, invalidated: ${logoutSuccess}`);
    return response;
  } catch (error) {
    console.error('[PIN Logout] Error:', error);
    return handleAPIError(error);
  }
}

// Clean up old rate limiting entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.lastAttempt > 3600000) { // 1 hour
        rateLimitStore.delete(key);
      }
    }
  }, 3600000); // Clean every hour
}