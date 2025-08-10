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

    // Get user profile from profiles table
    const { data: userProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('[Demo Status API] Error fetching user demo status:', error);
      throw error;
    }

    // Get active assistants from user_assistants table
    const { data: activeAssistants } = await supabase
      .from('user_assistants')
      .select('*')
      .eq('user_id', user.id)
      .eq('assistant_state', 'active');

    // Calculate assistant expiry info from user_assistants
    const assistantExpiryInfo = activeAssistants?.map(assistant => {
      const createdAt = new Date(assistant.created_at);
      const expiresAt = new Date(assistant.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        id: assistant.id,
        name: assistant.name,
        usageMinutes: assistant.usage_minutes || 0,
        daysUntilExpiry,
        isExpiredByTime: now > expiresAt,
        isExpiredByUsage: (userProfile?.current_usage_minutes || 0) >= (userProfile?.max_minutes_total || DEMO_LIMITS.MAX_MINUTES_TOTAL)
      };
    }) || [];

    const activeAssistantCount = activeAssistants?.length || 0;
    const currentUsageMinutes = userProfile?.current_usage_minutes || 0;
    const maxMinutesTotal = userProfile?.max_minutes_total || DEMO_LIMITS.MAX_MINUTES_TOTAL;
    const maxAssistants = userProfile?.max_assistants || DEMO_LIMITS.MAX_ASSISTANTS;
    const remainingMinutes = Math.max(0, maxMinutesTotal - currentUsageMinutes);
    const remainingAssistantSlots = Math.max(0, maxAssistants - activeAssistantCount);
    const usageLimitReached = currentUsageMinutes >= maxMinutesTotal;
    const assistantLimitReached = activeAssistantCount >= maxAssistants;

    // Build demo status response from actual schema data
    const demoStatus = {
      userId: user.id,
      email: userProfile?.email || user.email,
      fullName: userProfile?.full_name || 'User',
      
      // Usage tracking
      currentUsageMinutes,
      maxMinutesTotal,
      remainingMinutes,
      usagePercentage: Math.round((currentUsageMinutes / maxMinutesTotal) * 100),
      
      // Assistant limits
      activeAssistants: activeAssistantCount,
      maxAssistants,
      remainingAssistantSlots,
      
      // Limit status
      usageLimitReached,
      assistantLimitReached,
      anyLimitReached: usageLimitReached || assistantLimitReached,
      
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
        if (usageLimitReached || assistantLimitReached) return 'critical';
        if (currentUsageMinutes >= maxMinutesTotal * 0.8) return 'warning';
        if (activeAssistantCount >= maxAssistants * 0.8) return 'warning';
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