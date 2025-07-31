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
      .from('user_assistants')
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

    // Get calls for this assistant

    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('started_at', { ascending: false })
      .limit(10)

    if (callsError) {
      console.error('Error fetching calls:', callsError)
    }

    // Analyze data
    const allCalls = calls || []
    const totalCalls = allCalls.length
    const totalCost = allCalls.reduce((sum, call) => sum + (call.cost || 0), 0)
    const totalDuration = allCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0
    
    // Success rate calculation (based on call status)
    const successfulCalls = allCalls.filter(call => call.status === 'completed')
    const successRate = totalCalls > 0 ? (successfulCalls.length / totalCalls) * 100 : 0

    // Note: Structured questions analytics would require call_transcripts table
    const questionAnalytics = null

    // Format recent calls for display
    const recentCalls = allCalls.slice(0, 5).map(call => ({
      id: call.id,
      caller_number: call.caller_number,
      duration: call.duration,
      cost: call.cost,
      started_at: call.started_at,
      status: call.status
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        totalCost: Number(totalCost.toFixed(2)),
        avgDuration: Number(avgDuration.toFixed(0)),
        successRate: Number(successRate.toFixed(1)),
        recentCalls,
        questionAnalytics
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