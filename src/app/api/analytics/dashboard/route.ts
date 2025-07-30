import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/analytics/dashboard - Get comprehensive dashboard data
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '30'
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get performance dashboard data
    const { data: performanceData, error: perfError } = await supabase
      .from('performance_dashboard')
      .select('*')
      .gte('call_date', `${days} days ago`)
      .order('call_date', { ascending: false })

    if (perfError) {
      console.error('Performance data error:', perfError)
      return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 })
    }

    // Get recent leads
    const { data: leadsData, error: leadsError } = await supabase
      .from('lead_analysis')
      .select('*')
      .order('call_time', { ascending: false })
      .limit(50)

    if (leadsError) {
      console.error('Leads data error:', leadsError)
    }

    // Get call analytics summary
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('call_analytics')
      .select('*')
      .gte('date', `${days} days ago`)
      .order('date', { ascending: false })

    if (analyticsError) {
      console.error('Analytics data error:', analyticsError)
    }

    // Calculate key metrics
    const totalCalls = performanceData?.reduce((sum, day) => sum + day.total_calls, 0) || 0
    const totalLeads = performanceData?.reduce((sum, day) => sum + day.leads_generated, 0) || 0
    const totalCost = performanceData?.reduce((sum, day) => sum + (day.total_cost_dollars || 0), 0) || 0
    const avgConversionRate = performanceData && performanceData.length > 0 
      ? performanceData.reduce((sum, day) => sum + (day.conversion_rate || 0), 0) / performanceData.length 
      : 0

    // Get conversation insights summary
    const { data: insightsData, error: insightsError } = await supabase
      .from('conversation_insights')
      .select(`
        sentiment_score,
        engagement_score,
        detected_topics,
        primary_intent,
        call_logs!inner(started_at)
      `)
      .gte('call_logs.started_at', `${days} days ago`)

    // Process insights data
    const topicsCount: Record<string, number> = {}
    const intentsCount: Record<string, number> = {}
    let totalSentiment = 0
    let totalEngagement = 0

    insightsData?.forEach(insight => {
      if (insight.detected_topics) {
        insight.detected_topics.forEach((topic: string) => {
          topicsCount[topic] = (topicsCount[topic] || 0) + 1
        })
      }
      if (insight.primary_intent) {
        intentsCount[insight.primary_intent] = (intentsCount[insight.primary_intent] || 0) + 1
      }
      totalSentiment += insight.sentiment_score || 0
      totalEngagement += insight.engagement_score || 0
    })

    const avgSentiment = insightsData?.length ? totalSentiment / insightsData.length : 0
    const avgEngagement = insightsData?.length ? totalEngagement / insightsData.length : 0

    return NextResponse.json({
      success: true,
      data: {
        // Key Metrics
        metrics: {
          totalCalls,
          totalLeads,
          totalCost: Math.round(totalCost * 100) / 100,
          conversionRate: Math.round(avgConversionRate * 100) / 100,
          costPerLead: totalLeads > 0 ? Math.round((totalCost / totalLeads) * 100) / 100 : 0,
          avgSentiment: Math.round(avgSentiment * 100) / 100,
          avgEngagement: Math.round(avgEngagement * 10) / 10
        },
        
        // Daily Performance Chart
        dailyPerformance: performanceData?.map(day => ({
          date: day.call_date,
          calls: day.total_calls,
          leads: day.leads_generated,
          conversionRate: day.conversion_rate,
          cost: day.total_cost_dollars,
          sentiment: day.avg_sentiment
        })) || [],
        
        // Lead Quality Breakdown
        leadQuality: performanceData?.reduce((acc, day) => {
          acc.hot += day.hot_leads || 0
          acc.warm += day.warm_leads || 0
          acc.cool += day.cool_leads || 0
          return acc
        }, { hot: 0, warm: 0, cool: 0 }) || { hot: 0, warm: 0, cool: 0 },
        
        // Top Topics
        topTopics: Object.entries(topicsCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([topic, count]) => ({ topic, count })),
        
        // Intent Distribution
        intentDistribution: Object.entries(intentsCount)
          .map(([intent, count]) => ({ intent, count })),
        
        // Recent High-Quality Leads
        recentLeads: leadsData?.filter(lead => 
          lead.lead_quality === 'hot' || lead.lead_quality === 'warm'
        ).slice(0, 10) || [],
        
        // Assistant Performance
        assistantPerformance: performanceData?.reduce((acc: any[], day) => {
          const existing = acc.find(a => a.name === day.assistant_name)
          if (existing) {
            existing.calls += day.total_calls
            existing.leads += day.leads_generated
            existing.cost += day.total_cost_dollars || 0
          } else {
            acc.push({
              name: day.assistant_name,
              calls: day.total_calls,
              leads: day.leads_generated,
              cost: day.total_cost_dollars || 0,
              conversionRate: day.conversion_rate
            })
          }
          return acc
        }, []) || []
      }
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}