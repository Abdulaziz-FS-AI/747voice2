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

    // Use the database function for real-time accurate usage
    const { data: usageCheck, error: usageError } = await supabase
      .rpc('can_user_make_call', { user_uuid: user.id });

    if (usageError) {
      console.error('Usage check error:', usageError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch usage data' } },
        { status: 500 }
      );
    }

    // Get user profile for additional info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants, usage_reset_date')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch user profile' } },
        { status: 500 }
      );
    }

    // Get call statistics for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: callStats, error: callError } = await supabase
      .from('call_logs')
      .select('duration_seconds, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (callError) {
      console.error('Call stats error:', callError);
      // Don't fail the request for call stats errors
    }

    // Extract usage data from database function result
    const usageData = usageCheck.usage;
    const minutesUsed = usageData.minutes_used;
    const minutesLimit = usageData.minutes_limit;
    const assistantsUsed = usageData.assistants_count;
    const assistantsLimit = usageData.assistants_limit;

    // Calculate days until reset
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate call statistics
    const completedCalls = callStats?.filter(call => call.status === 'completed') || [];
    const totalCalls = callStats?.length || 0;
    const successRate = totalCalls > 0 ? (completedCalls.length / totalCalls) * 100 : 0;
    const averageDuration = completedCalls.length > 0 
      ? completedCalls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / completedCalls.length
      : 0;

    const usage = {
      minutes: {
        used: Math.round(minutesUsed * 100) / 100, // Round to 2 decimal places
        limit: minutesLimit,
        percentage: (minutesUsed / minutesLimit) * 100,
        remaining: Math.max(0, minutesLimit - minutesUsed),
        daysUntilReset,
        canMakeCall: usageCheck.can_make_call
      },
      assistants: {
        count: assistantsUsed,
        limit: assistantsLimit,
        percentage: (assistantsUsed / assistantsLimit) * 100,
        remaining: Math.max(0, assistantsLimit - assistantsUsed),
        canCreateAssistant: usageCheck.can_create_assistant
      },
      calls: {
        totalThisMonth: totalCalls,
        successfulThisMonth: completedCalls.length,
        successRate: Math.round(successRate),
        averageDuration: Math.round(averageDuration),
        totalMinutesThisMonth: Math.round(minutesUsed * 100) / 100
      }
    };

    const userProfile = {
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      currentUsageMinutes: minutesUsed,
      maxMinutesMonthly: minutesLimit,
      currentAssistantCount: assistantsUsed,
      maxAssistants: assistantsLimit,
      usageResetDate: profile.usage_reset_date
    };

    return NextResponse.json({
      success: true,
      data: {
        profile: userProfile,
        usage,
        canPerformActions: {
          makeCall: usageCheck.can_make_call,
          createAssistant: usageCheck.can_create_assistant
        },
        lastUpdated: new Date().toISOString()
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

// POST endpoint to refresh/recalculate usage
export async function POST() {
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

    // Recalculate user usage using database function
    const { data: recalculatedUsage, error: calcError } = await supabase
      .rpc('calculate_monthly_usage', { user_uuid: user.id });

    if (calcError) {
      console.error('Usage recalculation error:', calcError);
      return NextResponse.json(
        { error: { message: 'Failed to recalculate usage' } },
        { status: 500 }
      );
    }

    // Update profile with recalculated usage
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        current_usage_minutes: recalculatedUsage,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: { message: 'Failed to update usage' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        recalculatedMinutes: recalculatedUsage,
        message: 'Usage recalculated successfully'
      }
    });

  } catch (error) {
    console.error('Usage refresh API error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}