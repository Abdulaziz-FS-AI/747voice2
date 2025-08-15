import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors';
import { validatePin, extractClientIP, extractUserAgent } from '@/lib/pin-auth';

// Rate limiting store (in production, use Redis/KV store)
const rateLimitStore = new Map<string, { attempts: number, lastAttempt: number, lockedUntil?: number }>()

// PIN validation - strictly 6 digits only
const pinLoginSchema = z.object({
  pin: z.string().regex(/^[0-9]{6}$/, 'PIN must be exactly 6 digits')
});

/**
 * POST /api/auth/pin-login
 * Validate PIN - SIMPLIFIED APPROACH (NO SESSION CREATION)
 * Returns client info for frontend to store locally
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

    const authResult = await validatePin(pin);
    
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
          message: authResult.error || 'Invalid PIN'
        }
      }, { status: 401 });
    }

    // Reset rate limiting on successful login
    rateLimitStore.delete(rateLimitKey);
    
    console.log(`[PIN Login] Successful authentication for ${authResult.company_name} from IP: ${clientIP}`);

    // SIMPLIFIED RESPONSE - NO SESSION TOKENS
    // Frontend will store client info and PIN locally for subsequent requests
    return NextResponse.json({
      success: true,
      data: {
        client_id: authResult.client_id,
        company_name: authResult.company_name,
        authenticated: true,
        // Note: PIN is not returned for security, frontend keeps it from form
      },
      message: `Welcome, ${authResult.company_name}!`
    });
    
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
 * Logout - SIMPLIFIED (NO SESSION TO INVALIDATE)
 * Just returns success for frontend to clear local data
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log(`[PIN Logout] Logout request (simplified - no session invalidation needed)`);
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
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