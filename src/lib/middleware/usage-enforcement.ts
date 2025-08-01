import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { UsageLimitError } from '@/lib/types/subscription.types';

/**
 * Middleware to enforce usage limits on protected endpoints
 */
export async function enforceUsageLimits(
  request: NextRequest,
  userId: string,
  limitType: 'assistants' | 'minutes',
  increment: number = 1
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();

  // Get user's current subscription and usage
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type, current_usage_minutes, max_minutes_monthly, max_assistants')
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

    if ((currentCount || 0) + increment > profile.max_assistants) {
      return NextResponse.json(
        { 
          success: false, 
          error: new UsageLimitError('assistants', currentCount || 0, profile.max_assistants)
        },
        { status: 403 }
      );
    }
  } else if (limitType === 'minutes') {
    if (profile.current_usage_minutes + increment > profile.max_minutes_monthly) {
      return NextResponse.json(
        { 
          success: false, 
          error: new UsageLimitError('minutes', profile.current_usage_minutes, profile.max_minutes_monthly)
        },
        { status: 403 }
      );
    }
  }

  // Limits not exceeded, allow request to continue
  return null;
}

/**
 * Check if user has active subscription
 */
export async function requireActiveSubscription(
  userId: string
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'SUBSCRIPTION_INACTIVE', 
          message: 'Active subscription required for this action' 
        } 
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user has Pro subscription
 */
export async function requireProSubscription(
  userId: string
): Promise<NextResponse | null> {
  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_type !== 'pro') {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'PRO_REQUIRED', 
          message: 'Pro subscription required for this feature' 
        } 
      },
      { status: 403 }
    );
  }

  return null;
}