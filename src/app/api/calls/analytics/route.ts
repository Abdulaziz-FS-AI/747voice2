import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/calls/analytics - Get call analytics and statistics
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const startDate = searchParams.get('start_date') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();
    const assistantId = searchParams.get('assistant_id');
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month
    const includeLeads = searchParams.get('include_leads') === 'true';

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'view_analytics');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view analytics',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Build base query
    let callQuery = supabase
      .from('calls')
      .select(`
        id,
        assistant_id,
        duration,
        cost,
        status,
        direction,
        created_at,
        started_at,
        ended_at,
        assistant:assistants(id, name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Apply team filter
    if (profile.team_id) {
      callQuery = callQuery.eq('team_id', profile.team_id);
    } else {
      callQuery = callQuery.eq('user_id', user.id);
    }

    // Apply assistant filter
    if (assistantId) {
      callQuery = callQuery.eq('assistant_id', assistantId);
    }

    const { data: calls, error } = await callQuery;

    if (error) {
      throw error;
    }

    // Get leads data if requested
    let leads: any[] = [];
    if (includeLeads && calls && calls.length > 0) {
      const callIds = calls.map(call => call.id);
      const { data: leadsData } = await supabase
        .from('leads')
        .select(`
          id,
          call_id,
          score,
          status,
          lead_type,
          created_at
        `)
        .in('call_id', callIds);
      
      leads = leadsData || [];
    }

    // Calculate overall statistics
    const totalCalls = calls?.length || 0;
    const completedCalls = calls?.filter(call => call.status === 'completed').length || 0;
    const failedCalls = calls?.filter(call => call.status === 'failed').length || 0;
    const inboundCalls = calls?.filter(call => call.direction === 'inbound').length || 0;
    const outboundCalls = calls?.filter(call => call.direction === 'outbound').length || 0;
    
    const totalDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0;
    const totalCost = calls?.reduce((sum, call) => sum + (call.cost || 0), 0) || 0;
    const avgDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;
    const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(lead => lead.score >= 70).length;
    const conversionRate = totalCalls > 0 ? (totalLeads / totalCalls) * 100 : 0;
    const avgLeadScore = totalLeads > 0 ? 
      leads.reduce((sum, lead) => sum + lead.score, 0) / totalLeads : 0;

    // Group calls by time period
    const getDateKey = (date: string) => {
      const d = new Date(date);
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          return weekStart.toISOString().split('T')[0];
        case 'month':
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        case 'day':
        default:
          return d.toISOString().split('T')[0];
      }
    };

    const timeSeriesData = calls?.reduce((acc, call) => {
      const dateKey = getDateKey(call.created_at);
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          total_calls: 0,
          completed_calls: 0,
          failed_calls: 0,
          inbound_calls: 0,
          outbound_calls: 0,
          total_duration: 0,
          total_cost: 0,
          total_leads: 0,
        };
      }
      
      acc[dateKey].total_calls++;
      if (call.status === 'completed') acc[dateKey].completed_calls++;
      if (call.status === 'failed') acc[dateKey].failed_calls++;
      if (call.direction === 'inbound') acc[dateKey].inbound_calls++;
      if (call.direction === 'outbound') acc[dateKey].outbound_calls++;
      acc[dateKey].total_duration += call.duration || 0;
      acc[dateKey].total_cost += call.cost || 0;
      
      return acc;
    }, {} as Record<string, any>) || {};

    // Add leads to time series data
    leads.forEach(lead => {
      const call = calls?.find(c => c.id === lead.call_id);
      if (call) {
        const dateKey = getDateKey(call.created_at);
        if (timeSeriesData[dateKey]) {
          timeSeriesData[dateKey].total_leads++;
        }
      }
    });

    const timeSeries = Object.values(timeSeriesData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Assistant performance breakdown
    const assistantStats = calls?.reduce((acc, call) => {
      const assistantName = (call.assistant as any)?.name || 'Unknown';
      
      if (!acc[assistantName]) {
        acc[assistantName] = {
          name: assistantName,
          total_calls: 0,
          completed_calls: 0,
          total_duration: 0,
          total_cost: 0,
          leads_generated: 0,
        };
      }
      
      acc[assistantName].total_calls++;
      if (call.status === 'completed') {
        acc[assistantName].completed_calls++;
        acc[assistantName].total_duration += call.duration || 0;
      }
      acc[assistantName].total_cost += call.cost || 0;
      
      return acc;
    }, {} as Record<string, any>) || {};

    // Add leads to assistant stats
    leads.forEach(lead => {
      const call = calls?.find(c => c.id === lead.call_id);
      if (call && call.assistant) {
        const assistantName = (call.assistant as any)?.name;
        if (assistantStats[assistantName]) {
          assistantStats[assistantName].leads_generated++;
        }
      }
    });

    const assistantPerformance = Object.values(assistantStats);

    // Call status distribution
    const statusDistribution = calls?.reduce((acc, call) => {
      acc[call.status] = (acc[call.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Lead type distribution (if leads included)
    const leadTypeDistribution = leads.reduce((acc, lead) => {
      const type = lead.lead_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hour of day analysis
    const hourlyDistribution = calls?.reduce((acc, call) => {
      const hour = new Date(call.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>) || {};

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
          group_by: groupBy,
        },
        overview: {
          total_calls: totalCalls,
          completed_calls: completedCalls,
          failed_calls: failedCalls,
          inbound_calls: inboundCalls,
          outbound_calls: outboundCalls,
          success_rate: Math.round(successRate * 100) / 100,
          total_duration: totalDuration,
          avg_duration: Math.round(avgDuration * 100) / 100,
          total_cost: Math.round(totalCost * 10000) / 10000,
          ...(includeLeads && {
            total_leads: totalLeads,
            qualified_leads: qualifiedLeads,
            conversion_rate: Math.round(conversionRate * 100) / 100,
            avg_lead_score: Math.round(avgLeadScore * 100) / 100,
          }),
        },
        trends: {
          time_series: timeSeries,
        },
        breakdowns: {
          assistant_performance: assistantPerformance,
          status_distribution: statusDistribution,
          hourly_distribution: hourlyDistribution,
          ...(includeLeads && {
            lead_type_distribution: leadTypeDistribution,
          }),
        },
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}