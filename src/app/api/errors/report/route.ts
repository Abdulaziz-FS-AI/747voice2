import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { rateLimitAPI } from '@/lib/middleware/rate-limiting';

interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: {
    componentStack: string;
  };
  userAgent: string;
  url: string;
  timestamp: string;
  errorId: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for error reporting
    const rateLimitResponse = await rateLimitAPI(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const errorReport: ErrorReport = await request.json();
    
    // Validate required fields
    if (!errorReport.error || !errorReport.errorId) {
      return NextResponse.json({
        success: false,
        error: { message: 'Invalid error report format' }
      }, { status: 400 });
    }

    // Get user ID if available (non-blocking)
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (authError) {
      // Continue without user ID
    }

    // Store error in database
    const supabase = createServiceRoleClient('error_tracking');
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert({
        error_id: errorReport.errorId,
        user_id: userId,
        error_name: errorReport.error.name,
        error_message: errorReport.error.message,
        error_stack: errorReport.error.stack,
        component_stack: errorReport.errorInfo?.componentStack,
        user_agent: errorReport.userAgent,
        url: errorReport.url,
        timestamp: errorReport.timestamp,
        resolved: false,
        severity: 'high' // Default severity
      });

    if (dbError) {
      console.error('Failed to store error report:', dbError);
      // Don't fail the request - log locally instead
      console.error('Error Report:', errorReport);
    }

    // Log to console for immediate visibility
    console.error(`🚨 Client Error [${errorReport.errorId}]:`, {
      error: errorReport.error.message,
      url: errorReport.url,
      user: userId || 'anonymous'
    });

    return NextResponse.json({
      success: true,
      errorId: errorReport.errorId
    });

  } catch (error) {
    console.error('Error reporting endpoint failed:', error);
    return NextResponse.json({
      success: false,
      error: { message: 'Failed to process error report' }
    }, { status: 500 });
  }
}