import { NextResponse } from 'next/server';
import { AuthError, SubscriptionError } from '@/lib/auth';

// Vapi error handling
export class VapiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'VapiError';
  }
}

// API error handling
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

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

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: (error as any).issues
        }
      },
      { status: 400 }
    );
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as any;
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
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    },
    { status: 500 }
  );
}