import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

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

// API error handling
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Handle known error types
  // AuthError and SubscriptionError handling removed for standalone version

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

  // Supabase error handling removed for standalone version

  // Generic error fallback
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      }
    },
    { status: 500 }
  );
}