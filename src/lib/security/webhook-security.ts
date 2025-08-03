/**
 * Comprehensive webhook security module
 * Protects against replay attacks, injection, and other webhook vulnerabilities
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

interface WebhookSecurityOptions {
  maxBodySize?: number;
  timestampTolerance?: number; // seconds
  allowedIPs?: string[];
  requireHTTPS?: boolean;
}

// Cache for processed webhook IDs (prevent replay attacks)
const processedWebhooks = new Set<string>();
const WEBHOOK_CACHE_SIZE = 10000;

/**
 * Generate a unique webhook ID from request content
 */
function generateWebhookId(body: string, timestamp: number): string {
  return crypto
    .createHash('sha256')
    .update(`${body}:${timestamp}`)
    .digest('hex');
}

/**
 * Validate webhook timestamp to prevent replay attacks
 */
function validateTimestamp(timestamp: number, tolerance: number = 300): boolean {
  const now = Date.now() / 1000;
  const diff = Math.abs(now - timestamp);
  return diff <= tolerance;
}

/**
 * Validate IP allowlist
 */
function validateIPAddress(request: NextRequest, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) return true;
  
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown';
  
  return allowedIPs.includes(clientIP);
}

/**
 * Validate content type and size
 */
function validateContentType(request: NextRequest, maxBodySize: number): boolean {
  const contentType = request.headers.get('content-type');
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  
  // Must be JSON
  if (!contentType?.includes('application/json')) {
    return false;
  }
  
  // Check size limit
  if (contentLength > maxBodySize) {
    return false;
  }
  
  return true;
}

/**
 * Enhanced webhook signature verification
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  if (!signature || !secret) {
    return false;
  }
  
  try {
    // Support multiple signature formats
    let expectedSignature: string;
    
    if (signature.startsWith('sha256=')) {
      // GitHub/Stripe style
      expectedSignature = signature;
    } else {
      // Raw signature
      expectedSignature = `${algorithm}=${signature}`;
    }
    
    const computedSignature = `${algorithm}=${crypto
      .createHmac(algorithm, secret)
      .update(body, 'utf8')
      .digest('hex')}`;
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Comprehensive webhook security validation
 */
export async function validateWebhookSecurity(
  request: NextRequest,
  options: WebhookSecurityOptions = {}
): Promise<{
  isValid: boolean;
  reason?: string;
  body?: string;
}> {
  const {
    maxBodySize = 1024 * 1024, // 1MB default
    timestampTolerance = 300, // 5 minutes
    allowedIPs = [],
    requireHTTPS = process.env.NODE_ENV === 'production'
  } = options;
  
  try {
    // 1. HTTPS enforcement in production
    if (requireHTTPS && request.nextUrl.protocol !== 'https:') {
      return { isValid: false, reason: 'HTTPS required' };
    }
    
    // 2. IP allowlist validation
    if (!validateIPAddress(request, allowedIPs)) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      console.warn(`🚨 Webhook from unauthorized IP: ${clientIP}`);
      return { isValid: false, reason: 'IP not allowed' };
    }
    
    // 3. Content type and size validation
    if (!validateContentType(request, maxBodySize)) {
      return { isValid: false, reason: 'Invalid content type or size' };
    }
    
    // 4. Read and validate body
    const body = await request.text();
    
    if (body.length === 0) {
      return { isValid: false, reason: 'Empty body' };
    }
    
    // 5. Basic JSON validation
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return { isValid: false, reason: 'Invalid JSON' };
    }
    
    // 6. Timestamp validation (if provided)
    const timestamp = parsedBody.timestamp || parsedBody.created_at;
    if (timestamp && !validateTimestamp(timestamp, timestampTolerance)) {
      return { isValid: false, reason: 'Timestamp outside tolerance' };
    }
    
    // 7. Replay attack prevention
    const webhookId = generateWebhookId(body, timestamp || Date.now() / 1000);
    if (processedWebhooks.has(webhookId)) {
      return { isValid: false, reason: 'Duplicate webhook (replay attack)' };
    }
    
    // Add to processed cache
    processedWebhooks.add(webhookId);
    
    // Keep cache size manageable
    if (processedWebhooks.size > WEBHOOK_CACHE_SIZE) {
      const values = Array.from(processedWebhooks);
      const toRemove = values.slice(0, values.length - WEBHOOK_CACHE_SIZE + 1000);
      toRemove.forEach(id => processedWebhooks.delete(id));
    }
    
    return { isValid: true, body };
    
  } catch (error) {
    console.error('Webhook security validation failed:', error);
    return { isValid: false, reason: 'Security validation error' };
  }
}

/**
 * Audit webhook processing
 */
export function auditWebhookEvent(
  eventType: string,
  source: string,
  success: boolean,
  metadata: Record<string, any> = {}
) {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    source,
    success,
    metadata: {
      ...metadata,
      userAgent: metadata.userAgent?.substring(0, 100), // Truncate for security
    }
  };
  
  if (!success) {
    console.warn('🚨 Webhook processing failed:', auditEntry);
  } else {
    console.log('✅ Webhook processed:', auditEntry);
  }
}

/**
 * Get VAPI-specific IP allowlist
 */
export function getVAPIAllowedIPs(): string[] {
  // These would be VAPI's actual webhook IP ranges
  // For now, return empty array to allow all (but with signature verification)
  return [];
}

/**
 * Security headers for webhook responses
 */
export function getWebhookSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer'
  };
}