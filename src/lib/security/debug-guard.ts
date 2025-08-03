/**
 * Security guard for debug endpoints
 * Prevents debug endpoints from being accessible in production
 */

import { NextResponse } from 'next/server';

/**
 * Check if debug endpoints should be accessible
 * Only allow in development or when explicitly enabled with secret
 */
export function isDebugAllowed(): boolean {
  // Never allow in production unless explicitly enabled with secret
  if (process.env.NODE_ENV === 'production') {
    const debugSecret = process.env.DEBUG_SECRET;
    const isExplicitlyEnabled = debugSecret && debugSecret.length >= 32; // Require strong secret
    
    if (!isExplicitlyEnabled) {
      console.warn('🚨 SECURITY: Debug endpoint accessed in production but DEBUG_SECRET not set');
      return false;
    }
    
    console.warn('🔓 DEBUG: Debug endpoint enabled in production with secret');
    return true;
  }
  
  // Allow in development
  return process.env.NODE_ENV === 'development';
}

/**
 * Guard wrapper for debug endpoints
 * Returns 404 in production unless explicitly enabled
 */
export function debugGuard() {
  if (!isDebugAllowed()) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }
  return null;
}

/**
 * Security headers for debug responses
 */
export function addSecurityHeaders(response: NextResponse) {
  // Add security headers to prevent caching and indexing
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('X-Debug-Endpoint', 'true');
  return response;
}