import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { UsageService } from '@/lib/services/usage.service';

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

    // Get user profile (with auto-creation if missing)
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants, usage_reset_date')
      .eq('id', user.id)
      .single();

    // If no profile exists, create one with default values (same logic as UsageService)
    if (!profile && profileError?.code === 'PGRST116') {
      console.log('No profile found, creating default profile for user:', user.id);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          full_name: user.user_metadata?.full_name || 'Unknown User',
          current_usage_minutes: 0,
          max_minutes_monthly: 10,
          max_assistants: 3,  // Free users get 3 assistants
          usage_reset_date: new Date().toISOString().split('T')[0],
          onboarding_completed: false
        })
        .select('id, email, full_name, current_usage_minutes, max_minutes_monthly, max_assistants, usage_reset_date')
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        return NextResponse.json(
          { error: { message: 'Failed to create user profile' } },
          { status: 500 }
        );
      }

      profile = newProfile;
      console.log('Created new profile for usage API:', profile);
    } else if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch user profile' } },
        { status: 500 }
      );
    }

    // Get current assistant count
    const { count: assistantCount, error: assistantCountError } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (assistantCountError) {
      console.error('Assistant count error:', assistantCountError);
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

    // Calculate usage directly from data (no database functions needed)
    const minutesUsed = profile.current_usage_minutes || 0;
    const minutesLimit = profile.max_minutes_monthly || 10;
    const assistantsUsed = assistantCount || 0;
    const assistantsLimit = profile.max_assistants || 3;
    
    // Calculate permissions
    const canMakeCall = minutesUsed < minutesLimit;
    const canCreateAssistant = assistantsUsed < assistantsLimit;

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
        canMakeCall: canMakeCall
      },
      assistants: {
        count: assistantsUsed,
        limit: assistantsLimit,
        percentage: (assistantsUsed / assistantsLimit) * 100,
        remaining: Math.max(0, assistantsLimit - assistantsUsed),
        canCreateAssistant: canCreateAssistant
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
          makeCall: canMakeCall,
          createAssistant: canCreateAssistant
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

    // Calculate current month usage from call logs
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: calls, error: callsError } = await supabase
      .from('call_logs')
      .select('duration_seconds')
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if (callsError) {
      console.error('Failed to fetch calls for recalculation:', callsError);
      return NextResponse.json(
        { error: { message: 'Failed to fetch call data' } },
        { status: 500 }
      );
    }

    // Calculate total minutes used this month
    const totalSeconds = calls?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0;
    const recalculatedMinutes = Math.ceil(totalSeconds / 60);

    // Update profile with recalculated usage
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        current_usage_minutes: recalculatedMinutes,
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
        recalculatedMinutes: recalculatedMinutes,
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