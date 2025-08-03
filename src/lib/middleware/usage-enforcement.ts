import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { USER_LIMITS } from '@/lib/constants/subscription-plans';

/**
 * Middleware to enforce simple usage limits on protected endpoints
 */
export async function enforceUsageLimits(
  request: NextRequest,
  userId: string,
  limitType: 'assistants' | 'minutes',
  increment: number = 1
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();

  // Get user's current usage
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_usage_minutes, max_minutes_monthly, max_assistants')
    .eq('id', userId)
    .single();

  if (!profile) {
    return NextResponse.json(
      { success: false, error: { code: 'USER_NOT_FOUND', message: 'User profile not found' } },
      { status: 404 }
    );
  }

  // Check limits based on type
  if (limitType === 'assistants') {
    const { count: currentCount } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const limit = profile.max_assistants || USER_LIMITS.MAX_ASSISTANTS;
    if ((currentCount || 0) + increment > limit) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `Assistant limit exceeded: ${currentCount}/${limit}`,
            limitType: 'assistants',
            current: currentCount || 0,
            limit: limit
          }
        },
        { status: 403 }
      );
    }
  } else if (limitType === 'minutes') {
    const limit = profile.max_minutes_monthly || USER_LIMITS.MAX_MINUTES_MONTHLY;
    if ((profile.current_usage_minutes || 0) + increment > limit) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `Minutes limit exceeded: ${profile.current_usage_minutes}/${limit}`,
            limitType: 'minutes',
            current: profile.current_usage_minutes || 0,
            limit: limit
          }
        },
        { status: 403 }
      );
    }
  }

  // Limits not exceeded, allow request to continue
  return null;
}