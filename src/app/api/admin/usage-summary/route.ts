import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { UsageService } from '@/lib/services/usage.service';

// GET /api/admin/usage-summary - Get system-wide usage summary (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const { user } = await requirePermission('admin');
    const supabase = createServiceRoleClient();
    
    // Get overall system stats
    const { data: systemStats } = await supabase
      .rpc('get_system_usage_stats');
    
    // Get subscription distribution
    const { data: subscriptionDist } = await supabase
      .from('profiles')
      .select('subscription_type')
      .not('subscription_type', 'is', null);
    
    const distribution = subscriptionDist?.reduce((acc: any, profile: any) => {
      acc[profile.subscription_type] = (acc[profile.subscription_type] || 0) + 1;
      return acc;
    }, { free: 0, pro: 0 });
    
    // Get all users and filter those approaching limits
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, current_usage_minutes, max_minutes_monthly, subscription_type')
      .order('current_usage_minutes', { ascending: false });
    
    // Filter users approaching limits (80% or more usage)
    const usersNearLimit = allUsers?.filter(user => 
      user.current_usage_minutes >= (user.max_minutes_monthly * 0.8)
    ).slice(0, 20) || [];
    
    // Get recent subscription changes
    const { data: recentEvents } = await supabase
      .from('subscription_events')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .in('event_type', ['upgraded', 'downgraded', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Get revenue metrics
    const { data: revenueData } = await supabase
      .from('subscription_events')
      .select('created_at, metadata')
      .eq('event_type', 'payment_succeeded')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const monthlyRevenue = revenueData?.reduce((sum, event) => {
      return sum + (event.metadata?.amount || 0) / 100; // Convert from cents
    }, 0) || 0;
    
    return NextResponse.json({
      success: true,
      data: {
        systemStats: systemStats?.[0] || {
          totalUsers: 0,
          totalAssistants: 0,
          totalMinutesUsed: 0,
          totalCalls: 0
        },
        subscriptionDistribution: distribution,
        usersApproachingLimits: usersNearLimit?.map(user => ({
          id: user.id,
          email: user.email,
          name: user.full_name,
          subscription: user.subscription_type,
          usagePercentage: Math.round((user.current_usage_minutes / user.max_minutes_monthly) * 100),
          minutesUsed: user.current_usage_minutes,
          minutesLimit: user.max_minutes_monthly
        })) || [],
        recentSubscriptionChanges: recentEvents?.map(event => ({
          userId: event.user_id,
          userEmail: event.profiles.email,
          userName: event.profiles.full_name,
          eventType: event.event_type,
          fromPlan: event.from_plan,
          toPlan: event.to_plan,
          timestamp: event.created_at
        })) || [],
        revenue: {
          monthlyRecurring: monthlyRevenue,
          activeProUsers: distribution?.pro || 0,
          projectedMonthly: (distribution?.pro || 0) * 25
        }
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}