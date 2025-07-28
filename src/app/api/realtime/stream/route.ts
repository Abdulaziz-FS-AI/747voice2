import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/realtime/stream - Server-Sent Events endpoint for real-time updates
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, profile } = await authenticateRequest();

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialMessage = `data: ${JSON.stringify({
          type: 'connection',
          message: 'Connected to Voice Matrix real-time updates',
          timestamp: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(initialMessage));

        // Set up periodic status updates
        const statusInterval = setInterval(async () => {
          try {
            const statusData = await getRealtimeStatus(user.id, profile.team_id);
            const message = `data: ${JSON.stringify({
              type: 'status_update',
              data: statusData,
              timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));
          } catch (error) {
            console.error('Error sending status update:', error);
          }
        }, 30000); // Every 30 seconds

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        }, 10000); // Every 10 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(statusInterval);
          clearInterval(heartbeatInterval);
          controller.close();
        });

        // Handle client disconnect
        const cleanup = () => {
          clearInterval(statusInterval);
          clearInterval(heartbeatInterval);
          controller.close();
        };

        // Store cleanup function for later use
        (controller as any).cleanup = cleanup;
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('SSE authentication error:', error);
    return new Response('Unauthorized', { status: 401 });
  }
}

// Get real-time status data
async function getRealtimeStatus(userId: string, teamId: string | null) {
  const supabase = createServiceRoleClient();

  try {
    // Get active calls count
    let activeCallsQuery = supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .in('status', ['initiated', 'ringing', 'answered']);

    if (teamId) {
      activeCallsQuery = activeCallsQuery.eq('team_id', teamId);
    } else {
      activeCallsQuery = activeCallsQuery.eq('user_id', userId);
    }

    const { count: activeCalls } = await activeCallsQuery;

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    
    let todayCallsQuery = supabase
      .from('calls')
      .select('id, status', { count: 'exact' })
      .gte('created_at', today);

    if (teamId) {
      todayCallsQuery = todayCallsQuery.eq('team_id', teamId);
    } else {
      todayCallsQuery = todayCallsQuery.eq('user_id', userId);
    }

    const { data: todayCalls, count: totalTodayCalls } = await todayCallsQuery;
    const completedTodayCalls = todayCalls?.filter(call => call.status === 'completed').length || 0;

    // Get today's leads
    let todayLeadsQuery = supabase
      .from('leads')
      .select('id, score', { count: 'exact' })
      .gte('created_at', today);

    if (teamId) {
      todayLeadsQuery = todayLeadsQuery.eq('team_id', teamId);
    } else {
      todayLeadsQuery = todayLeadsQuery.eq('user_id', userId);
    }

    const { data: todayLeads, count: totalTodayLeads } = await todayLeadsQuery;
    const qualifiedTodayLeads = todayLeads?.filter(lead => lead.score >= 70).length || 0;

    // Get overdue follow-ups count
    let overdueQuery = supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .lt('next_follow_up_at', new Date().toISOString())
      .neq('status', 'converted')
      .neq('status', 'lost');

    if (teamId) {
      overdueQuery = overdueQuery.eq('team_id', teamId);
    } else {
      overdueQuery = overdueQuery.eq('user_id', userId);
    }

    const { count: overdueFollowUps } = await overdueQuery;

    return {
      active_calls: activeCalls || 0,
      today_stats: {
        total_calls: totalTodayCalls || 0,
        completed_calls: completedTodayCalls,
        total_leads: totalTodayLeads || 0,
        qualified_leads: qualifiedTodayLeads,
        success_rate: totalTodayCalls ? (completedTodayCalls / totalTodayCalls) * 100 : 0,
        conversion_rate: totalTodayCalls && totalTodayLeads ? (totalTodayLeads / totalTodayCalls) * 100 : 0,
      },
      overdue_follow_ups: overdueFollowUps || 0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting realtime status:', error);
    return {
      error: 'Failed to fetch status',
      timestamp: new Date().toISOString(),
    };
  }
}