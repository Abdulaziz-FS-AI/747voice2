import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await authenticateRequest()
    const { id: assistantId } = await params
    
    if (!assistantId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_ASSISTANT_ID', message: 'Assistant ID is required' }
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user owns this assistant
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, user_id')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'ASSISTANT_NOT_FOUND', message: 'Assistant not found or access denied' }
      }, { status: 404 })
    }

    // Get call logs for this assistant
    let callLogs = []
    try {
      const { data: logs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('started_at', { ascending: false })
        .limit(10)
      
      if (!logsError && logs) {
        callLogs = logs
      }
    } catch {
      console.log('call_logs table not found, using calls table')
    }

    // Get calls from calls table as fallback
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('started_at', { ascending: false })
      .limit(10)

    if (callsError) {
      console.error('Error fetching calls:', callsError)
    }

    // Combine and analyze data
    const allCalls = [...callLogs, ...(calls || [])]
    const totalCalls = allCalls.length
    const totalCost = allCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
    const totalDuration = allCalls.reduce((sum, call) => sum + (call.duration_seconds || call.duration || 0), 0)
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0
    
    // Success rate calculation (based on success_evaluation)
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
      return false
    })
    const successRate = totalCalls > 0 ? (successfulCalls.length / totalCalls) * 100 : 0

    // Analyze dynamic questions
    const questionAnalytics: Record<string, any> = {}
    
    for (const call of allCalls) {
      if (call.structured_data) {
        try {
          const structuredData = typeof call.structured_data === 'string' 
            ? JSON.parse(call.structured_data) 
            : call.structured_data

          Object.entries(structuredData).forEach(([fieldName, value]) => {
            if (!questionAnalytics[fieldName]) {
              questionAnalytics[fieldName] = {
                totalAsked: 0,
                answeredCount: 0,
                answerTypes: {}
              }
            }
            
            questionAnalytics[fieldName].totalAsked++
            
            if (value !== null && value !== undefined && value !== '') {
              questionAnalytics[fieldName].answeredCount++
              
              const valueType = typeof value
              if (!questionAnalytics[fieldName].answerTypes[valueType]) {
                questionAnalytics[fieldName].answerTypes[valueType] = 0
              }
              questionAnalytics[fieldName].answerTypes[valueType]++
            }
          })
        } catch (error) {
          console.error('Error parsing structured_data:', error)
        }
      }
    }

    // Format recent calls for display
    const recentCalls = allCalls.slice(0, 5).map(call => ({
      id: call.id,
      caller_number: call.caller_number,
      duration_seconds: call.duration_seconds || call.duration,
      cost: call.cost,
      started_at: call.started_at,
      structured_data: call.structured_data,
      success_evaluation: call.success_evaluation,
      summary: call.summary
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        totalCost: Number(totalCost.toFixed(2)),
        avgDuration: Number(avgDuration.toFixed(0)),
        successRate: Number(successRate.toFixed(1)),
        recentCalls,
        questionAnalytics: Object.keys(questionAnalytics).length > 0 ? questionAnalytics : null
      }
    })

  } catch (error) {
    console.error('GET assistant analytics error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'ANALYTICS_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to fetch analytics' 
      }
    }, { status: 500 })
  }
}