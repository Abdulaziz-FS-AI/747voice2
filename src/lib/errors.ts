import { NextResponse } from 'next/server';
import { AuthError, SubscriptionError } from '@/lib/auth';
import { ZodError } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

// Vapi error handling
export class VapiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VapiError';
  }
}

// Standard API error classes
export class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

// Alias for backwards compatibility
export const VAPIError = VapiError;

// API error handling
export function handleAPIError(error: unknown): NextResponse {
  console.error('❌ [ERROR HANDLER] ===== HANDLING API ERROR =====');
  console.error('❌ [ERROR HANDLER] Error type:', typeof error);
  console.error('❌ [ERROR HANDLER] Error name:', error instanceof Error ? error.name : 'Unknown');
  console.error('❌ [ERROR HANDLER] Error message:', error instanceof Error ? error.message : String(error));
  console.error('❌ [ERROR HANDLER] Error stack:', error instanceof Error ? error.stack : 'No stack');
  console.error('❌ [ERROR HANDLER] Full error object:', error);

  // Handle known error types
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof SubscriptionError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SUBSCRIPTION_ERROR',
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof VapiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VAPI_ERROR',
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode || 500 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details
        }
      },
      { status: 400 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          details: error.details
        }
      },
      { status: 404 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message,
          details: error.details
        }
      },
      { status: 409 }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: error.message,
          details: error.details
        }
      },
      { status: 429 }
    );
  }

  if (error instanceof ServiceUnavailableError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: error.message,
          details: error.details
        }
      },
      { status: 503 }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.issues
        }
      },
      { status: 400 }
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const supabaseError = error as PostgrestError;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: supabaseError.message || 'Database operation failed',
          details: supabaseError.details
        }
      },
      { status: 500 }
    );
  }

  // Generic error fallback
  console.error('❌ [ERROR HANDLER] Using generic error fallback');
  
  // Show detailed errors in production for debugging (temporarily)
  const showDetailedErrors = true; // Always show for debugging
  
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: showDetailedErrors 
          ? `Error: ${error instanceof Error ? error.message : String(error)}`
          : 'An unexpected error occurred',
        details: showDetailedErrors ? {
          errorType: typeof error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : 'No stack',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        } : undefined
      }
    },
    { status: 500 }
  );
}