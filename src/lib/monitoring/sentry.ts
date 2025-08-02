/**
 * Production Error Tracking & Monitoring System
 * Sentry integration for comprehensive error tracking
 */

import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
  userId?: string
  endpoint?: string
  userAgent?: string
  ip?: string
  requestBody?: any
  metadata?: Record<string, any>
}

export interface PerformanceMetrics {
  operation: string
  duration: number
  success: boolean
  userId?: string
  metadata?: Record<string, any>
}

/**
 * Initialize Sentry with production configuration
 */
export function initSentry() {
  if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% of transactions
      debug: false,
      beforeSend(event, hint) {
        // Filter out sensitive data
        if (event.request?.data) {
          // Remove passwords, API keys, etc.
          const sanitized = { ...event.request.data }
          delete sanitized.password
          delete sanitized.apiKey
          delete sanitized.token
          event.request.data = sanitized
        }
        return event
      },
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Console(),
      ],
    })
  }
}

/**
 * Enhanced error logging with context
 */
export class ErrorTracker {
  static captureError(
    error: Error | string,
    context?: ErrorContext,
    level: 'error' | 'warning' | 'info' | 'fatal' = 'error'
  ) {
    console.error('[ErrorTracker]', error, context)

    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel(level)
        
        if (context?.userId) {
          scope.setUser({ id: context.userId })
        }
        
        if (context?.endpoint) {
          scope.setTag('endpoint', context.endpoint)
        }
        
        if (context?.userAgent) {
          scope.setContext('userAgent', { value: context.userAgent })
        }
        
        if (context?.ip) {
          scope.setContext('ip', { value: context.ip })
        }
        
        if (context?.requestBody) {
          scope.setContext('requestBody', context.requestBody)
        }
        
        if (context?.metadata) {
          Object.entries(context.metadata).forEach(([key, value]) => {
            scope.setExtra(key, value)
          })
        }
        
        if (typeof error === 'string') {
          Sentry.captureMessage(error)
        } else {
          Sentry.captureException(error)
        }
      })
    }
  }

  static captureApiError(
    error: Error | string,
    request: Request,
    userId?: string,
    metadata?: Record<string, any>
  ) {
    const context: ErrorContext = {
      userId,
      endpoint: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          undefined,
      metadata
    }
    
    this.captureError(error, context)
  }

  static captureAuthError(error: Error | string, userId?: string) {
    this.captureError(error, {
      userId,
      endpoint: '/auth',
      metadata: { category: 'authentication' }
    })
  }

  static capturePaymentError(
    error: Error | string, 
    userId?: string, 
    paymentData?: any
  ) {
    this.captureError(error, {
      userId,
      endpoint: '/payment',
      metadata: { 
        category: 'payment',
        paymentProvider: 'paypal',
        ...paymentData
      }
    }, 'fatal') // Payment errors are critical
  }

  static captureVapiError(
    error: Error | string,
    assistantId?: string,
    callId?: string,
    userId?: string
  ) {
    this.captureError(error, {
      userId,
      endpoint: '/vapi',
      metadata: {
        category: 'vapi_integration',
        assistantId,
        callId
      }
    })
  }

  static captureUsageViolation(
    limitType: 'minutes' | 'assistants',
    current: number,
    limit: number,
    userId: string
  ) {
    this.captureError(`Usage limit exceeded: ${limitType}`, {
      userId,
      metadata: {
        category: 'usage_violation',
        limitType,
        current,
        limit,
        overage: current - limit
      }
    }, 'warning')
  }
}

/**
 * Performance monitoring for critical operations
 */
export class PerformanceTracker {
  private static startTimes = new Map<string, number>()

  static startTransaction(operationId: string): void {
    this.startTimes.set(operationId, Date.now())
  }

  static endTransaction(
    operationId: string,
    operation: string,
    success: boolean = true,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const startTime = this.startTimes.get(operationId)
    if (!startTime) return

    const duration = Date.now() - startTime
    this.startTimes.delete(operationId)

    // Log performance metrics
    console.log(`[Performance] ${operation}: ${duration}ms (${success ? 'SUCCESS' : 'FAILURE'})`)

    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      const transaction = Sentry.startTransaction({
        name: operation,
        op: 'function'
      })

      transaction.setData('duration', duration)
      transaction.setData('success', success)
      
      if (userId) {
        transaction.setData('userId', userId)
      }
      
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          transaction.setData(key, value)
        })
      }

      transaction.finish()
    }

    // Alert on slow operations
    if (duration > 5000) { // 5+ seconds
      ErrorTracker.captureError(`Slow operation detected: ${operation}`, {
        userId,
        metadata: {
          category: 'performance',
          operation,
          duration,
          threshold: 5000
        }
      }, 'warning')
    }
  }
}

/**
 * Business metrics tracking
 */
export class BusinessMetrics {
  static trackSignup(userId: string, plan: string, source?: string) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: 'User signup completed',
        category: 'business',
        data: {
          userId,
          plan,
          source
        },
        level: 'info'
      })
    }
  }

  static trackSubscriptionChange(
    userId: string,
    fromPlan: string,
    toPlan: string,
    revenue?: number
  ) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: 'Subscription changed',
        category: 'business',
        data: {
          userId,
          fromPlan,
          toPlan,
          revenue
        },
        level: 'info'
      })
    }
  }

  static trackAssistantCreated(userId: string, assistantId: string) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: 'Assistant created',
        category: 'usage',
        data: {
          userId,
          assistantId
        },
        level: 'info'
      })
    }
  }

  static trackCallCompleted(
    userId: string,
    assistantId: string,
    duration: number,
    cost: number
  ) {
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      Sentry.addBreadcrumb({
        message: 'Call completed',
        category: 'usage',
        data: {
          userId,
          assistantId,
          duration,
          cost
        },
        level: 'info'
      })
    }
  }
}

/**
 * Health check monitoring
 */
export class HealthMonitor {
  static async checkDatabaseHealth(): Promise<boolean> {
    try {
      // This would connect to your database and run a simple query
      // Implementation depends on your database setup
      return true
    } catch (error) {
      ErrorTracker.captureError('Database health check failed', {
        metadata: { category: 'health_check', service: 'database' }
      })
      return false
    }
  }

  static async checkVapiHealth(): Promise<boolean> {
    try {
      // This would ping Vapi API to check connectivity
      const response = await fetch('https://api.vapi.ai/health', {
        method: 'GET',
        timeout: 5000
      })
      return response.ok
    } catch (error) {
      ErrorTracker.captureError('Vapi health check failed', {
        metadata: { category: 'health_check', service: 'vapi' }
      })
      return false
    }
  }

  static async checkPayPalHealth(): Promise<boolean> {
    try {
      // Basic connectivity check to PayPal
      const response = await fetch('https://api.paypal.com/v1/oauth2/token', {
        method: 'HEAD',
        timeout: 5000
      })
      return response.status !== 500 // Allow 401/403, just not 500
    } catch (error) {
      ErrorTracker.captureError('PayPal health check failed', {
        metadata: { category: 'health_check', service: 'paypal' }
      })
      return false
    }
  }

  static async runHealthChecks(): Promise<{
    database: boolean
    vapi: boolean
    paypal: boolean
    overall: boolean
  }> {
    const results = {
      database: await this.checkDatabaseHealth(),
      vapi: await this.checkVapiHealth(),
      paypal: await this.checkPayPalHealth(),
      overall: false
    }
    
    results.overall = results.database && results.vapi && results.paypal
    
    if (!results.overall) {
      ErrorTracker.captureError('System health check failed', {
        metadata: { 
          category: 'health_check',
          results
        }
      }, 'warning')
    }
    
    return results
  }
}

// Convenience exports
export {
  ErrorTracker as captureError,
  PerformanceTracker as trackPerformance,
  BusinessMetrics as trackMetrics,
  HealthMonitor as healthCheck
}