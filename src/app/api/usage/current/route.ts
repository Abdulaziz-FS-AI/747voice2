import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

// GET /api/usage/current - Get current period usage data
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    // Get current month's start date
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Get all calls for the current user this month
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, duration, cost, status, created_at')
      .eq('user_id', user.id)
      .gte('created_at', monthStart)

    if (callsError) {
      console.error('Failed to get calls data:', callsError)
      return NextResponse.json({
        success: false,
        error: {
          code: 'USAGE_FETCH_FAILED',
          message: 'Failed to fetch usage data'
        }
      }, { status: 500 })
    }

    // Calculate current month usage
    const totalCalls = calls?.length || 0
    const totalDuration = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0
    const totalCost = calls?.reduce((sum, call) => sum + (call.cost || 0), 0) || 0
    const completedCalls = calls?.filter(call => call.status === 'completed').length || 0

    // Get user profile for limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('max_assistants, max_minutes, max_phone_numbers')
      .eq('id', user.id)
      .single()

    // Get current resource counts
    const { data: assistants } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: phoneNumbers } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Calculate metrics
    const averageCallCost = totalCalls > 0 ? totalCost / totalCalls : 0
    const averageCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0
    const totalMinutes = Math.round(totalDuration / 60)

    // Get last 30 days for trend analysis
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('created_at, cost, duration')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Group by day for trend analysis
    const dailyTrend = groupCallsByDay(recentCalls || [])

    return NextResponse.json({
      success: true,
      data: {
        // Current period totals
        totalCalls,
        totalDuration,
        totalCost,
        completedCalls,
        totalMinutes,
        
        // Resource usage
        usage: {
          assistants: assistants?.length || 0,
          phoneNumbers: phoneNumbers?.length || 0,
          minutes: totalMinutes
        },
        
        // Limits from profile
        limits: {
          maxAssistants: profile?.max_assistants || 10,
          maxPhoneNumbers: profile?.max_phone_numbers || 5,
          maxMinutes: profile?.max_minutes || 1000
        },
        
        // Period info
        periodStart: monthStart,
        
        // Averages
        averages: {
          costPerCall: Math.round(averageCallCost * 100) / 100,
          durationPerCall: Math.round(averageCallDuration),
          minutesPerCall: Math.round(averageCallDuration / 60 * 100) / 100
        },
        
        // Trend data (last 30 days)
        dailyTrend
      }
    })

  } catch (error) {
    console.error('Get current usage error:', error)
    return handleAPIError(error)
  }
}

function groupCallsByDay(calls: any[]): any[] {
  const groups: Record<string, { date: string; calls: number; cost: number; duration: number }> = {}
  
  calls.forEach(call => {
    const date = new Date(call.created_at).toISOString().split('T')[0]
    if (!groups[date]) {
      groups[date] = { date, calls: 0, cost: 0, duration: 0 }
    }
    groups[date].calls += 1
    groups[date].cost += call.cost || 0
    groups[date].duration += call.duration || 0
  })
  
  return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}