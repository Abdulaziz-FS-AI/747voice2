import { NextResponse } from 'next/server';
import { SubscriptionError } from '@/lib/types/subscription.types';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof SubscriptionError) {
    return NextResponse.json(
      { 
        error: { 
          message: error.message, 
          code: error.code,
          statusCode: error.statusCode 
        } 
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { 
        error: { 
          message: error.message, 
          code: 'INTERNAL_ERROR' 
        } 
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { 
      error: { 
        message: 'An unexpected error occurred', 
        code: 'UNKNOWN_ERROR' 
      } 
    },
    { status: 500 }
  );
}