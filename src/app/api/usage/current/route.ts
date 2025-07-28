import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

// GET /api/usage/current - Get current period usage data
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    // Get user's team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'User team not found'
        }
      }, { status: 404 })
    }

    // Get current usage data using database function
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_team_current_usage', { team_uuid: profile.team_id })

    if (usageError) {
      console.error('Failed to get usage data:', usageError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'USAGE_FETCH_FAILED',
          message: 'Failed to fetch usage data'
        }
      }, { status: 500 })
    }

    const usage = usageData?.[0] || {
      total_calls: 0,
      total_duration: 0,
      total_cost: 0,
      ai_model_cost: 0,
      transcription_cost: 0,
      tts_cost: 0,
      phone_cost: 0,
      period_start: new Date().toISOString()
    }

    // Get recent daily usage for trend analysis
    const { data: dailyUsage } = await supabase
      .from('daily_usage')
      .select('usage_date, total_cost, calls_count, total_duration')
      .eq('team_id', profile.team_id)
      .gte('usage_date', getDateDaysAgo(30))
      .order('usage_date', { ascending: false })
      .limit(30)

    // Get team settings for cost alerts
    const { data: team } = await supabase
      .from('teams')
      .select('cost_alert_threshold, current_period_calls, current_period_cost')
      .eq('id', profile.team_id)
      .single()

    // Calculate additional metrics
    const averageCallCost = usage.total_calls > 0 ? usage.total_cost / usage.total_calls : 0
    const averageCallDuration = usage.total_calls > 0 ? usage.total_duration / usage.total_calls : 0
    
    // Calculate monthly trend
    const thisMonthData = dailyUsage?.filter(day => 
      new Date(day.usage_date).getMonth() === new Date().getMonth()
    ) || []
    
    const monthlyStats = thisMonthData.reduce((acc, day) => ({
      calls: acc.calls + (day.calls_count || 0),
      cost: acc.cost + (day.total_cost || 0),
      duration: acc.duration + (day.total_duration || 0)
    }), { calls: 0, cost: 0, duration: 0 })

    // Calculate daily average for the last 7 days
    const last7Days = dailyUsage?.slice(0, 7) || []
    const weeklyAverage = last7Days.length > 0 ? {
      dailyCost: last7Days.reduce((sum, day) => sum + (day.total_cost || 0), 0) / last7Days.length,
      dailyCalls: last7Days.reduce((sum, day) => sum + (day.calls_count || 0), 0) / last7Days.length
    } : { dailyCost: 0, dailyCalls: 0 }

    // Check if approaching cost threshold
    const costThreshold = team?.cost_alert_threshold || 100
    const isApproachingThreshold = usage.total_cost >= costThreshold * 0.8
    const hasExceededThreshold = usage.total_cost >= costThreshold

    return NextResponse.json({
      success: true,
      data: {
        // Current period totals
        totalCalls: usage.total_calls,
        totalDuration: usage.total_duration,
        totalCost: usage.total_cost,
        
        // Cost breakdown
        costBreakdown: {
          aiModel: usage.ai_model_cost,
          transcription: usage.transcription_cost,
          textToSpeech: usage.tts_cost,
          phone: usage.phone_cost
        },
        
        // Period info
        periodStart: usage.period_start,
        
        // Averages
        averages: {
          costPerCall: averageCallCost,
          durationPerCall: averageCallDuration,
          dailyCost: weeklyAverage.dailyCost,
          dailyCalls: weeklyAverage.dailyCalls
        },
        
        // Monthly comparison
        monthlyStats: {
          calls: monthlyStats.calls,
          cost: monthlyStats.cost,
          duration: monthlyStats.duration
        },
        
        // Alert info
        alerts: {
          costThreshold,
          isApproachingThreshold,
          hasExceededThreshold,
          thresholdPercentage: Math.round((usage.total_cost / costThreshold) * 100)
        },
        
        // Trend data (last 30 days)
        dailyTrend: dailyUsage?.map(day => ({
          date: day.usage_date,
          cost: day.total_cost || 0,
          calls: day.calls_count || 0,
          duration: day.total_duration || 0
        })) || []
      }
    })

  } catch (error) {
    console.error('Get current usage error:', error)
    return handleAPIError(error)
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}