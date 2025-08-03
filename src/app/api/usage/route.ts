import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { USER_LIMITS } from '@/lib/constants/subscription-plans';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user profile with usage data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch user profile' } },
        { status: 500 }
      );
    }

    // Get assistant count
    const { count: assistantCount, error: assistantError } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (assistantError) {
      console.error('Assistant count error:', assistantError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch assistant count' } },
        { status: 500 }
      );
    }

    // Get call statistics for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: callStats, error: callError } = await supabase
      .from('call_logs')
      .select('duration_seconds, status')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (callError) {
      console.error('Call stats error:', callError);
      // Don't fail the request for call stats errors
    }

    // Calculate usage details
    const minutesUsed = profile.current_usage_minutes || 0;
    const minutesLimit = profile.max_minutes_monthly || USER_LIMITS.MAX_MINUTES_MONTHLY;
    const assistantsUsed = assistantCount || 0;
    const assistantsLimit = profile.max_assistants || USER_LIMITS.MAX_ASSISTANTS;

    // Calculate days until reset (simple monthly reset)
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate call statistics
    const successfulCalls = callStats?.filter(call => call.status === 'completed') || [];
    const totalCalls = callStats?.length || 0;
    const successRate = totalCalls > 0 ? (successfulCalls.length / totalCalls) * 100 : 0;
    const averageDuration = successfulCalls.length > 0 
      ? successfulCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / successfulCalls.length
      : 0;

    const usage = {
      minutes: {
        used: minutesUsed,
        limit: minutesLimit,
        percentage: (minutesUsed / minutesLimit) * 100,
        daysUntilReset
      },
      assistants: {
        count: assistantsUsed,
        limit: assistantsLimit,
        percentage: (assistantsUsed / assistantsLimit) * 100
      },
      calls: {
        totalThisMonth: totalCalls,
        successRate: Math.round(successRate),
        averageDuration: Math.round(averageDuration)
      }
    };

    const userProfile = {
      userId: profile.id,
      currentUsageMinutes: minutesUsed,
      maxMinutesMonthly: minutesLimit,
      currentAssistantCount: assistantsUsed,
      maxAssistants: assistantsLimit
    };

    return NextResponse.json({
      success: true,
      data: {
        profile: userProfile,
        usage
      }
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}