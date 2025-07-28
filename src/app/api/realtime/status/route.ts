import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/realtime/status - Get real-time status and statistics
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';

    const supabase = createServiceRoleClient();

    // Get current active calls
    let activeCallsQuery = supabase
      .from('calls')
      .select(`
        id,
        status,
        started_at,
        caller_number,
        assistant:assistants(
          id,
          name
        )
      `)
      .in('status', ['initiated', 'ringing', 'answered']);

    if (profile.team_id) {
      activeCallsQuery = activeCallsQuery.eq('team_id', profile.team_id);
    } else {
      activeCallsQuery = activeCallsQuery.eq('user_id', user.id);
    }

    const { data: activeCalls } = await activeCallsQuery;

    // Get recent leads (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    let recentLeadsQuery = supabase
      .from('leads')
      .select('id, first_name, last_name, score, status, created_at')
      .gte('created_at', last24Hours);

    if (profile.team_id) {
      recentLeadsQuery = recentLeadsQuery.eq('team_id', profile.team_id);
    } else {
      recentLeadsQuery = recentLeadsQuery.eq('user_id', user.id);
    }

    const { data: recentLeads } = await recentLeadsQuery
      .order('created_at', { ascending: false })
      .limit(10);

    // Get overdue follow-ups
    let overdueQuery = supabase
      .from('leads')
      .select(`
        id,
        first_name,
        last_name,
        next_follow_up_at,
        status
      `)
      .lt('next_follow_up_at', new Date().toISOString())
      .neq('status', 'converted')
      .neq('status', 'lost');

    if (profile.team_id) {
      overdueQuery = overdueQuery.eq('team_id', profile.team_id);
    } else {
      overdueQuery = overdueQuery.eq('user_id', user.id);
    }

    const { data: overdueFollowUps } = await overdueQuery
      .order('next_follow_up_at', { ascending: true })
      .limit(5);

    // Get today's statistics
    const today = new Date().toISOString().split('T')[0];
    
    let todayCallsQuery = supabase
      .from('calls')
      .select('id, status, duration, cost')
      .gte('created_at', today);

    if (profile.team_id) {
      todayCallsQuery = todayCallsQuery.eq('team_id', profile.team_id);
    } else {
      todayCallsQuery = todayCallsQuery.eq('user_id', user.id);
    }

    const { data: todayCalls } = await todayCallsQuery;

    let todayLeadsQuery = supabase
      .from('leads')
      .select('id, score, status')
      .gte('created_at', today);

    if (profile.team_id) {
      todayLeadsQuery = todayLeadsQuery.eq('team_id', profile.team_id);
    } else {
      todayLeadsQuery = todayLeadsQuery.eq('user_id', user.id);
    }

    const { data: todayLeads } = await todayLeadsQuery;

    // Calculate today's stats
    const todayStats = {
      total_calls: todayCalls?.length || 0,
      completed_calls: todayCalls?.filter(call => call.status === 'completed').length || 0,
      total_duration: todayCalls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0,
      total_cost: todayCalls?.reduce((sum, call) => sum + (call.cost || 0), 0) || 0,
      total_leads: todayLeads?.length || 0,
      qualified_leads: todayLeads?.filter(lead => lead.score >= 70).length || 0,
    };

    const responseData = {
      timestamp: new Date().toISOString(),
      active_calls: {
        count: activeCalls?.length || 0,
        calls: includeDetails ? activeCalls : undefined,
      },
      recent_leads: {
        count: recentLeads?.length || 0,
        leads: includeDetails ? recentLeads : undefined,
      },
      overdue_follow_ups: {
        count: overdueFollowUps?.length || 0,
        follow_ups: includeDetails ? overdueFollowUps : undefined,
      },
      today_stats: todayStats,
      alerts: generateAlerts(activeCalls, overdueFollowUps, todayStats),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// Generate alerts based on current data
function generateAlerts(
  activeCalls: any[] = [],
  overdueFollowUps: any[] = [],
  todayStats: any
): Array<{ type: string; message: string; severity: 'info' | 'warning' | 'error' }> {
  const alerts = [];

  // Active calls alert
  if (activeCalls.length > 0) {
    alerts.push({
      type: 'active_calls',
      message: `${activeCalls.length} call${activeCalls.length > 1 ? 's' : ''} currently in progress`,
      severity: 'info' as const,
    });
  }

  // Overdue follow-ups alert
  if (overdueFollowUps.length > 0) {
    alerts.push({
      type: 'overdue_follow_ups',
      message: `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length > 1 ? 's' : ''} need attention`,
      severity: 'warning' as const,
    });
  }

  // High activity alert
  if (todayStats.total_calls > 50) {
    alerts.push({
      type: 'high_activity',
      message: `High call volume today: ${todayStats.total_calls} calls`,
      severity: 'info' as const,
    });
  }

  // Low conversion alert
  if (todayStats.total_calls > 10 && todayStats.total_leads === 0) {
    alerts.push({
      type: 'low_conversion',
      message: 'No leads generated today despite active calls',
      severity: 'warning' as const,
    });
  }

  return alerts;
}