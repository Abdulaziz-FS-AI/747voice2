/**
 * Production-Ready Rate Limiting System
 * Multi-layer protection against API abuse
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest) => string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
  blocked?: boolean
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public limit: number,
    public remaining: number,
    public resetTime: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * In-memory rate limiting with Redis-like behavior
 * Production should use Redis for multi-instance support
 */
class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime <= now) {
        this.store.delete(key)
      }
    }
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const resetTime = now + windowMs
    
    const existing = this.store.get(key)
    
    if (!existing || existing.resetTime <= now) {
      // New window or expired
      const result = { count: 1, resetTime }
      this.store.set(key, result)
      return result
    } else {
      // Increment existing
      existing.count++
      this.store.set(key, existing)
      return existing
    }
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const existing = this.store.get(key)
    if (!existing || existing.resetTime <= Date.now()) {
      return null
    }
    return existing
  }

  destroy() {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter()

/**
 * Rate limiting configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // 100 requests per 15 minutes per IP
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10 // 10 login attempts per 15 minutes per IP
  },
  
  // Webhook endpoints (more lenient but still protected)
  webhook: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30 // 30 webhooks per minute per IP
  },
  
  // Assistant creation (expensive operations)
  assistant: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20 // 20 assistant operations per hour per user
  },
  
  // Call-related endpoints
  calls: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50 // 50 call operations per 5 minutes per user
  }
} as const

/**
 * Generate rate limit key based on IP and optional user ID
 */
function generateRateLimitKey(
  request: NextRequest, 
  prefix: string, 
  userId?: string
): string {
  const ip = getClientIP(request)
  const baseKey = userId ? `${prefix}:user:${userId}` : `${prefix}:ip:${ip}`
  return baseKey
}

/**
 * Extract client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) return realIP
  if (clientIP) return clientIP
  
  // Fallback
  return request.ip || 'unknown'
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  prefix: string,
  userId?: string
): Promise<RateLimitResult> {
  try {
    const key = config.keyGenerator 
      ? config.keyGenerator(request)
      : generateRateLimitKey(request, prefix, userId)

    const result = await rateLimiter.increment(key, config.windowMs)
    
    const rateLimitResult: RateLimitResult = {
      success: result.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - result.count),
      resetTime: result.resetTime,
      blocked: result.count > config.maxRequests
    }

    return rateLimitResult
  } catch (error) {
    console.error('Rate limiting error:', error)
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs
    }
  }
}

/**
 * Middleware function for API routes
 */
export async function withRateLimit(
  request: NextRequest,
  configType: keyof typeof RATE_LIMIT_CONFIGS,
  userId?: string
): Promise<NextResponse | null> {
  const config = RATE_LIMIT_CONFIGS[configType]
  const result = await applyRateLimit(request, config, configType, userId)

  // Add rate limit headers to response
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Limit: ${result.limit} per ${Math.round(config.windowMs / 60000)} minutes.`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
        }
      }
    )
  }

  return null // Allow request to continue
}

/**
 * Enhanced rate limiting with IP-based tracking in database
 */
export class PersistentRateLimiter {
  private supabase = createServiceRoleClient()

  async trackRequest(
    ip: string,
    endpoint: string,
    userId?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('rate_limits')
        .insert({
          key: `${endpoint}:${ip}`,
          timestamp: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent
        })
    } catch (error) {
      console.error('Failed to track request:', error)
      // Don't throw - rate limiting shouldn't break functionality
    }
  }

  async checkBruteForce(
    ip: string,
    endpoint: string,
    windowMinutes: number = 15,
    maxAttempts: number = 10
  ): Promise<boolean> {
    try {
      const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
      
      const { count } = await this.supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .like('key', `${endpoint}:%`)
        .gte('timestamp', cutoff)

      return (count || 0) > maxAttempts
    } catch (error) {
      console.error('Brute force check error:', error)
      return false // Fail open
    }
  }

  async cleanupOldEntries(): Promise<void> {
    try {
      // Clean up entries older than 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      await this.supabase
        .from('rate_limits')
        .delete()
        .lt('timestamp', cutoff)
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }
}

/**
 * Convenience functions for common use cases
 */
export const rateLimitAPI = (request: NextRequest, userId?: string) => 
  withRateLimit(request, 'api', userId)

export const rateLimitAuth = (request: NextRequest) => 
  withRateLimit(request, 'auth')

export const rateLimitWebhook = (request: NextRequest) => 
  withRateLimit(request, 'webhook')

export const rateLimitAssistant = (request: NextRequest, userId: string) => 
  withRateLimit(request, 'assistant', userId)

export const rateLimitCalls = (request: NextRequest, userId: string) => 
  withRateLimit(request, 'calls', userId)

// Export rate limiter instance for advanced usage
export { rateLimiter }