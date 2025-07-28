import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/leads/analytics - Get lead analytics and statistics
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const startDate = searchParams.get('start_date') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month
    const assistantId = searchParams.get('assistant_id');

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'view_analytics');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view lead analytics',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Build base query for leads
    let leadQuery = supabase
      .from('leads')
      .select(`
        *,
        call:calls(
          id,
          assistant_id,
          duration,
          status,
          created_at,
          assistant:assistants(
            id,
            name
          )
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Apply team filter
    if (profile.team_id) {
      leadQuery = leadQuery.eq('team_id', profile.team_id);
    } else {
      leadQuery = leadQuery.eq('user_id', user.id);
    }

    const { data: leads, error } = await leadQuery;

    if (error) {
      throw error;
    }

    // Filter by assistant if specified
    const filteredLeads = assistantId ? 
      leads?.filter(lead => lead.call?.assistant_id === assistantId) : leads;

    // Calculate overall statistics
    const totalLeads = filteredLeads?.length || 0;
    const qualifiedLeads = filteredLeads?.filter(lead => lead.score >= 70).length || 0;
    const convertedLeads = filteredLeads?.filter(lead => lead.status === 'converted').length || 0;
    const lostLeads = filteredLeads?.filter(lead => lead.status === 'lost').length || 0;
    
    const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const avgLeadScore = totalLeads > 0 ? 
      filteredLeads?.reduce((sum, lead) => sum + lead.score, 0)! / totalLeads : 0;

    // Lead source analysis
    const sourceDistribution = filteredLeads?.reduce((acc, lead) => {
      const source = lead.lead_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Lead type analysis
    const typeDistribution = filteredLeads?.reduce((acc, lead) => {
      const type = lead.lead_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Lead status analysis
    const statusDistribution = filteredLeads?.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Score distribution (buckets)
    const scoreDistribution = {
      'low (0-40)': 0,
      'medium (41-69)': 0,
      'high (70-84)': 0,
      'excellent (85-100)': 0,
    };

    filteredLeads?.forEach(lead => {
      if (lead.score <= 40) scoreDistribution['low (0-40)']++;
      else if (lead.score <= 69) scoreDistribution['medium (41-69)']++;
      else if (lead.score <= 84) scoreDistribution['high (70-84)']++;
      else scoreDistribution['excellent (85-100)']++;
    });

    // Time series analysis
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

    const timeSeriesData = filteredLeads?.reduce((acc, lead) => {
      const dateKey = getDateKey(lead.created_at);
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          total_leads: 0,
          qualified_leads: 0,
          converted_leads: 0,
          avg_score: 0,
          scores: [],
        };
      }
      
      acc[dateKey].total_leads++;
      acc[dateKey].scores.push(lead.score);
      
      if (lead.score >= 70) acc[dateKey].qualified_leads++;
      if (lead.status === 'converted') acc[dateKey].converted_leads++;
      
      return acc;
    }, {} as Record<string, any>) || {};

    // Calculate average scores for each time period
    Object.values(timeSeriesData).forEach((period: any) => {
      period.avg_score = period.scores.length > 0 ? 
        period.scores.reduce((sum: number, score: number) => sum + score, 0) / period.scores.length : 0;
      delete period.scores; // Remove scores array from response
    });

    const timeSeries = Object.values(timeSeriesData).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Assistant performance analysis
    const assistantPerformance = filteredLeads?.reduce((acc, lead) => {
      if (lead.call?.assistant) {
        const assistantName = lead.call.assistant.name;
        
        if (!acc[assistantName]) {
          acc[assistantName] = {
            name: assistantName,
            total_leads: 0,
            qualified_leads: 0,
            converted_leads: 0,
            avg_score: 0,
            scores: [],
          };
        }
        
        acc[assistantName].total_leads++;
        acc[assistantName].scores.push(lead.score);
        
        if (lead.score >= 70) acc[assistantName].qualified_leads++;
        if (lead.status === 'converted') acc[assistantName].converted_leads++;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // Calculate average scores and conversion rates for assistants
    Object.values(assistantPerformance).forEach((assistant: any) => {
      assistant.avg_score = assistant.scores.length > 0 ? 
        assistant.scores.reduce((sum: number, score: number) => sum + score, 0) / assistant.scores.length : 0;
      assistant.conversion_rate = assistant.total_leads > 0 ? 
        (assistant.converted_leads / assistant.total_leads) * 100 : 0;
      delete assistant.scores;
    });

    // Budget analysis (for buyer/investor leads)
    const budgetRanges = {
      'under_100k': 0,
      '100k_300k': 0,
      '300k_500k': 0,
      '500k_1m': 0,
      'over_1m': 0,
      'not_specified': 0,
    };

    filteredLeads?.forEach(lead => {
      if (['buyer', 'investor'].includes(lead.lead_type || '')) {
        const budgetMax = lead.budget_max;
        if (!budgetMax) {
          budgetRanges.not_specified++;
        } else if (budgetMax < 100000) {
          budgetRanges.under_100k++;
        } else if (budgetMax < 300000) {
          budgetRanges['100k_300k']++;
        } else if (budgetMax < 500000) {
          budgetRanges['300k_500k']++;
        } else if (budgetMax < 1000000) {
          budgetRanges['500k_1m']++;
        } else {
          budgetRanges.over_1m++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
          group_by: groupBy,
        },
        overview: {
          total_leads: totalLeads,
          qualified_leads: qualifiedLeads,
          converted_leads: convertedLeads,
          lost_leads: lostLeads,
          qualification_rate: Math.round(qualificationRate * 100) / 100,
          conversion_rate: Math.round(conversionRate * 100) / 100,
          avg_lead_score: Math.round(avgLeadScore * 100) / 100,
        },
        trends: {
          time_series: timeSeries,
        },
        distributions: {
          lead_sources: sourceDistribution,
          lead_types: typeDistribution,
          lead_status: statusDistribution,
          score_distribution: scoreDistribution,
          budget_ranges: budgetRanges,
        },
        performance: {
          assistants: Object.values(assistantPerformance),
        },
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}