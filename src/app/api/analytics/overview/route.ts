import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Try to authenticate but don't fail if it doesn't work
    let user = null
    try {
      const authResult = await authenticateRequest()
      user = authResult.user
    } catch (authError) {
      console.log('Authentication failed, returning empty analytics:', authError)
      return NextResponse.json({
        success: true,
        data: {
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          topAssistants: [],
          recentActivity: [],
          dailyStats: []
        }
      })
    }

    const supabase = createServiceRoleClient()

    // Get all assistants for the user - with error handling
    let assistants: Array<{ id: string, name: string }> = []
    try {
      const { data: assistantsData, error: assistantsError } = await supabase
        .from('assistants')
        .select('id, name')
        .eq('user_id', user.id)

      if (assistantsError) {
        console.error('Error fetching assistants:', assistantsError)
        // Don't throw - just continue with empty assistants
        assistants = []
      } else {
        assistants = assistantsData || []
      }
    } catch (dbError) {
      console.error('Database connection error for assistants:', dbError)
      assistants = []
    }

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          topAssistants: [],
          recentActivity: [],
          dailyStats: []
        }
      })
    }

    const assistantIds = assistants.map(a => a.id)

    // Get call logs for all user assistants - with robust error handling
    let allCallLogs: any[] = []
    try {
      const { data: callLogs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .in('assistant_id', assistantIds)
        .order('started_at', { ascending: false })
        .limit(100)
      
      if (!logsError && callLogs) {
        allCallLogs = callLogs
      }
    } catch (error) {
      console.log('call_logs table not found or inaccessible, skipping:', error)
    }

    // Get calls from calls table as fallback - with error handling
    let calls: any[] = []
    try {
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .in('assistant_id', assistantIds)
        .order('started_at', { ascending: false })
        .limit(100)

      if (callsError) {
        console.error('Error fetching calls:', callsError)
        calls = []
      } else {
        calls = callsData || []
      }
    } catch (error) {
      console.error('calls table not found or inaccessible, skipping:', error)
      calls = []
    }

    // Combine all call data
    const allCalls = [...allCallLogs, ...calls]
    
    // Calculate overall statistics
    const totalCalls = allCalls.length
    const totalCost = allCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
    const totalDuration = allCalls.reduce((sum, call) => sum + (call.duration_seconds || call.duration || 0), 0)
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0

    // Calculate success rate
    const successfulCalls = allCalls.filter(call => {
      if (call.success_evaluation) {
        try {
          const evaluation = typeof call.success_evaluation === 'string' 
            ? JSON.parse(call.success_evaluation) 
            : call.success_evaluation
          return evaluation.success === true || evaluation.overall_success === true
        } catch {
          return false
        }
      }
      return call.status === 'completed'
    })
    const successRate = totalCalls > 0 ? (successfulCalls.length / totalCalls) * 100 : 0

    // Calculate assistant performance
    const assistantStats = assistants.map(assistant => {
      const assistantCalls = allCalls.filter(call => call.assistant_id === assistant.id)
      const assistantCost = assistantCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
      const assistantSuccessful = assistantCalls.filter(call => {
        if (call.success_evaluation) {
          try {
            const evaluation = typeof call.success_evaluation === 'string' 
              ? JSON.parse(call.success_evaluation) 
              : call.success_evaluation
            return evaluation.success === true || evaluation.overall_success === true
          } catch {
            return false
          }
        }
        return call.status === 'completed'
      })
      const assistantSuccessRate = assistantCalls.length > 0 ? (assistantSuccessful.length / assistantCalls.length) * 100 : 0

      return {
        id: assistant.id,
        name: assistant.name,
        calls: assistantCalls.length,
        cost: assistantCost,
        successRate: Math.round(assistantSuccessRate)
      }
    }).sort((a, b) => b.calls - a.calls).slice(0, 5)

    // Recent activity
    const recentActivity = allCalls.slice(0, 10).map(call => {
      const assistant = assistants.find(a => a.id === call.assistant_id)
      let success = false
      
      if (call.success_evaluation) {
        try {
          const evaluation = typeof call.success_evaluation === 'string' 
            ? JSON.parse(call.success_evaluation) 
            : call.success_evaluation
          success = evaluation.success === true || evaluation.overall_success === true
        } catch {
          success = false
        }
      } else {
        success = call.status === 'completed'
      }

      return {
        id: call.id,
        assistantName: assistant?.name || 'Unknown Assistant',
        callerNumber: call.caller_number,
        duration: call.duration_seconds || call.duration || 0,
        cost: call.cost || 0,
        success,
        timestamp: call.started_at || call.created_at
      }
    })

    // Daily statistics (last 7 days)
    const now = new Date()
    const dailyStats = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayCalls = allCalls.filter(call => {
        const callDate = new Date(call.started_at || call.created_at).toISOString().split('T')[0]
        return callDate === dateStr
      })
      
      const dayCost = dayCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
      const dayDuration = dayCalls.reduce((sum, call) => sum + (call.duration_seconds || call.duration || 0), 0)
      const dayAvgDuration = dayCalls.length > 0 ? dayDuration / dayCalls.length : 0
      
      dailyStats.push({
        date: dateStr,
        calls: dayCalls.length,
        cost: dayCost,
        avgDuration: dayAvgDuration
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        totalCost: Number(totalCost.toFixed(2)),
        totalDuration,
        avgDuration: Number(avgDuration.toFixed(0)),
        successRate: Number(successRate.toFixed(1)),
        topAssistants: assistantStats,
        recentActivity,
        dailyStats
      }
    })

  } catch (error) {
    console.error('GET analytics overview error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'ANALYTICS_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to fetch analytics overview' 
      }
    }, { status: 500 })
  }
}