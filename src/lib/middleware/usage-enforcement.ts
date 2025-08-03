import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { USER_LIMITS } from '@/lib/constants/subscription-plans';

/**
 * Real-time usage enforcement middleware using database functions
 */
export async function enforceUsageLimits(
  request: NextRequest,
  userId: string,
  limitType: 'assistants' | 'minutes',
  estimatedIncrement: number = 1
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();

  try {
    // Use database function for real-time accurate usage check
    const { data: usageCheck, error } = await supabase
      .rpc('can_user_make_call', { user_uuid: userId });

    if (error) {
      console.error('Usage enforcement error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'USAGE_CHECK_FAILED', message: 'Failed to check usage limits' } },
        { status: 500 }
      );
    }

    // Check limits based on type
    if (limitType === 'assistants') {
      if (!usageCheck.can_create_assistant) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'ASSISTANT_LIMIT_EXCEEDED', 
              message: `You've reached your assistant limit (${usageCheck.usage.assistants_count}/${usageCheck.usage.assistants_limit})`,
              usage: usageCheck.usage
            } 
          },
          { status: 429 }
        );
      }
    }

    if (limitType === 'minutes') {
      if (!usageCheck.can_make_call) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'MINUTE_LIMIT_EXCEEDED', 
              message: `You've reached your monthly minute limit (${usageCheck.usage.minutes_used.toFixed(1)}/${usageCheck.usage.minutes_limit})`,
              usage: usageCheck.usage
            } 
          },
          { status: 429 }
        );
      }

      // Check if estimated increment would exceed limit
      const estimatedNewUsage = usageCheck.usage.minutes_used + estimatedIncrement;
      if (estimatedNewUsage > usageCheck.usage.minutes_limit) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'ESTIMATED_LIMIT_EXCEEDED', 
              message: `Estimated operation (${estimatedIncrement} min) would exceed your remaining limit (${usageCheck.usage.minutes_remaining.toFixed(1)} min)`,
              usage: usageCheck.usage,
              estimated: {
                increment: estimatedIncrement,
                newTotal: estimatedNewUsage,
                wouldExceed: true
              }
            } 
          },
          { status: 429 }
        );
      }
    }

    // Limits are within acceptable range
    return null;

  } catch (error) {
    console.error('Usage enforcement unexpected error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'ENFORCEMENT_ERROR', message: 'Usage enforcement failed' } },
      { status: 500 }
    );
  }
}