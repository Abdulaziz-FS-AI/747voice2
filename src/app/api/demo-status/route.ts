import { NextRequest, NextResponse } from 'next/server';
import { requireAuth as authenticateRequest } from '@/lib/auth-simple';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { DEMO_LIMITS } from '@/types/database';

// GET /api/demo-status - Get current demo status for user
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest();
    const user = authResult.user;

    const supabase = createServiceRoleClient('demo_status');

    // Get user profile and demo status
    const { data: userStatus, error } = await supabase
      .from('user_demo_status')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('[Demo Status API] Error fetching user demo status:', error);
      throw error;
    }

    // Calculate time-based expiry for active assistants
    const { data: activeAssistants } = await supabase
      .from('active_assistants_view')
      .select('*')
      .eq('user_id', user.id);

    const assistantExpiryInfo = activeAssistants?.map(assistant => ({
      id: assistant.id,
      name: assistant.name,
      usageMinutes: assistant.usage_minutes,
      daysUntilExpiry: assistant.days_until_expiry,
      isExpiredByTime: assistant.is_expired_by_time,
      isExpiredByUsage: assistant.is_expired_by_usage,
      expiresAt: assistant.expires_at
    })) || [];

    // Enhanced demo status response
    const demoStatus = {
      userId: userStatus.user_id,
      email: userStatus.email,
      fullName: userStatus.full_name,
      
      // Usage tracking
      currentUsageMinutes: userStatus.current_usage_minutes,
      maxMinutesTotal: userStatus.max_minutes_total,
      remainingMinutes: userStatus.remaining_minutes,
      usagePercentage: Math.round((userStatus.current_usage_minutes / userStatus.max_minutes_total) * 100),
      
      // Assistant limits
      activeAssistants: userStatus.active_assistants,
      maxAssistants: userStatus.max_assistants,
      remainingAssistantSlots: userStatus.remaining_assistant_slots,
      
      // Limit status
      usageLimitReached: userStatus.usage_limit_reached,
      assistantLimitReached: userStatus.assistant_limit_reached,
      anyLimitReached: userStatus.usage_limit_reached || userStatus.assistant_limit_reached,
      
      // Demo info
      demoLimits: {
        maxAssistants: DEMO_LIMITS.MAX_ASSISTANTS,
        maxMinutesTotal: DEMO_LIMITS.MAX_MINUTES_TOTAL,
        maxLifetimeDays: DEMO_LIMITS.MAX_LIFETIME_DAYS
      },
      
      // Assistant expiry details
      assistants: assistantExpiryInfo,
      
      // Status indicators
      warningLevel: (() => {
        if (userStatus.usage_limit_reached || userStatus.assistant_limit_reached) return 'critical';
        if (userStatus.current_usage_minutes >= userStatus.max_minutes_total * 0.8) return 'warning';
        if (userStatus.active_assistants >= userStatus.max_assistants * 0.8) return 'warning';
        return 'normal';
      })()
    };

    return NextResponse.json({
      success: true,
      data: demoStatus
    });

  } catch (error) {
    console.error('[Demo Status API] Failed to fetch demo status:', error);
    return handleAPIError(error);
  }
}