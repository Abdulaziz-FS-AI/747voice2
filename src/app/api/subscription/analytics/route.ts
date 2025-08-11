import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/subscription/analytics - Get subscription analytics
export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    const supabase = createServiceRoleClient();
    
    // Get user's subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, current_usage_minutes, max_minutes_monthly, billing_cycle_start')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found' }
      }, { status: 404 });
    }
    
    // Get daily usage for current billing cycle
    const startOfCycle = new Date(profile.billing_cycle_start);
    const { data: dailyUsage } = await supabase
      .rpc('get_daily_usage', {
        p_user_id: user.id,
        p_start_date: startOfCycle.toISOString()
      });
    
    // Get call distribution by assistant
    const { data: assistantUsage } = await supabase
      .from('call_logs')
      .select(`
        assistant_id,
        user_assistants!inner(name),
        duration_seconds
      `)
      .eq('user_assistants.user_id', user.id)
      .gte('started_at', startOfCycle.toISOString());
    
    // Process assistant usage data
    const assistantStats = assistantUsage?.reduce((acc: any, call: any) => {
      const assistantId = call.assistant_id;
      if (!acc[assistantId]) {
        acc[assistantId] = {
          name: call.user_assistants.name,
          totalMinutes: 0,
          callCount: 0
        };
      }
      acc[assistantId].totalMinutes += Math.ceil((call.duration_seconds || 0) / 60);
      acc[assistantId].callCount += 1;
      return acc;
    }, {});
    
    // Get usage trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: trend } = await supabase
      .from('call_logs')
      .select('started_at, duration_seconds')
      .eq('user_assistants.user_id', user.id)
      .gte('started_at', thirtyDaysAgo.toISOString())
      .order('started_at', { ascending: true });
    
    // Calculate daily averages
    const dailyAverages = trend?.reduce((acc: any, call: any) => {
      const date = new Date(call.started_at).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += Math.ceil((call.duration_seconds || 0) / 60);
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          type: profile.subscription_type,
          usagePercentage: Math.round((profile.current_usage_minutes / profile.max_minutes_monthly) * 100),
          minutesUsed: profile.current_usage_minutes,
          minutesLimit: profile.max_minutes_monthly,
          minutesRemaining: profile.max_minutes_monthly - profile.current_usage_minutes
        },
        dailyUsage: dailyUsage || [],
        assistantUsage: Object.values(assistantStats || {}),
        usageTrend: Object.entries(dailyAverages || {}).map(([date, minutes]) => ({
          date,
          minutes
        })),
        projectedUsage: calculateProjectedUsage(
          profile.current_usage_minutes,
          profile.billing_cycle_start,
          profile.max_minutes_monthly
        )
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// Helper function to calculate projected usage
function calculateProjectedUsage(
  currentMinutes: number,
  cycleStart: string,
  maxMinutes: number
): { projected: number; willExceed: boolean; daysUntilLimit: number | null } {
  const now = new Date();
  const start = new Date(cycleStart);
  const daysInCycle = 30;
  const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysElapsed <= 0) {
    return { projected: 0, willExceed: false, daysUntilLimit: null };
  }
  
  const dailyRate = currentMinutes / daysElapsed;
  const projectedTotal = Math.round(dailyRate * daysInCycle);
  const willExceed = projectedTotal > maxMinutes;
  
  let daysUntilLimit = null;
  if (dailyRate > 0) {
    const remainingMinutes = maxMinutes - currentMinutes;
    daysUntilLimit = Math.floor(remainingMinutes / dailyRate);
  }
  
  return { projected: projectedTotal, willExceed, daysUntilLimit };
}