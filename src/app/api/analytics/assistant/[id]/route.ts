import { NextRequest, NextResponse } from 'next/server'
import { validatePinSession } from '@/lib/pin-auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

// Helper function to truncate transcript to one sentence
function truncateToSentence(text: string, maxLength: number = 80): string {
  if (!text) return ''
  
  // Find the first sentence ending
  const sentenceEnd = text.match(/[.!?]+/)
  if (sentenceEnd && sentenceEnd.index && sentenceEnd.index < maxLength) {
    return text.substring(0, sentenceEnd.index + 1)
  }
  
  // Fallback: truncate at word boundary
  if (text.length <= maxLength) return text
  const truncated = text.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
}

// Helper function to properly evaluate call success (matching main analytics)
function evaluateCallSuccess(evaluation: any): boolean {
  if (!evaluation) return false
  
  // Convert to string and normalize
  const evalStr = String(evaluation).toLowerCase().trim()
  
  // Exact matches for success (avoid substring false positives)
  const successValues = [
    'successful',
    'success',
    'qualified',
    'completed',
    'good',
    'excellent',
    'true',
    '1',
    'yes',
    'passed'
  ]
  
  // Check for exact match
  if (successValues.includes(evalStr)) {
    return true
  }
  
  // Check for boolean true
  if (evaluation === true || evaluation === 1) {
    return true
  }
  
  // Explicit failure checks (to avoid "unsuccessful" being marked as success)
  const failureIndicators = [
    'unsuccessful',
    'failed',
    'failure',
    'error',
    'bad',
    'poor',
    'false',
    '0',
    'no',
    'incomplete'
  ]
  
  if (failureIndicators.some(indicator => evalStr.includes(indicator))) {
    return false
  }
  
  // Default to false for unknown values
  return false
}

// Helper function to analyze success evaluation based on rubric type
function analyzeSuccessEvaluation(calls: any[], rubricType: string) {
  const breakdown: Record<string, number> = {}
  let totalEvaluated = 0
  
  calls.forEach(call => {
    // Use 'evaluation' field from call_info_log, not 'success_evaluation'
    if (!call.evaluation) return
    
    totalEvaluated++
    const evaluation = call.evaluation
    
    switch (rubricType) {
      case 'DescriptiveScale':
        // Excellent, Good, Fair, Poor
        const scales = ['Excellent', 'Good', 'Fair', 'Poor']
        if (scales.includes(evaluation)) {
          breakdown[evaluation] = (breakdown[evaluation] || 0) + 1
        }
        break
        
      case 'PercentageScale':
        // Group into ranges
        const percent = parseFloat(evaluation)
        if (!isNaN(percent)) {
          const range = percent >= 75 ? '75-100%' : 
                       percent >= 50 ? '50-74%' : 
                       percent >= 25 ? '25-49%' : '0-24%'
          breakdown[range] = (breakdown[range] || 0) + 1
        }
        break
        
      case 'PassFail':
        const result = evaluation === true || evaluation === 'true' || evaluation === 'Pass' ? 'Pass' : 'Fail'
        breakdown[result] = (breakdown[result] || 0) + 1
        break
        
      case 'LikertScale':
        // Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree
        const likertScales = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']
        if (likertScales.includes(evaluation)) {
          breakdown[evaluation] = (breakdown[evaluation] || 0) + 1
        }
        break
        
      case 'Checklist':
        // Handle checklist items
        if (typeof evaluation === 'object') {
          Object.entries(evaluation).forEach(([key, value]) => {
            const status = value ? 'Completed' : 'Not Completed'
            breakdown[`${key}: ${status}`] = (breakdown[`${key}: ${status}`] || 0) + 1
          })
        }
        break
        
      default:
        // Generic handling
        breakdown[String(evaluation)] = (breakdown[String(evaluation)] || 0) + 1
    }
  })
  
  return { breakdown, totalEvaluated }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // PIN-based authentication
    const sessionResult = await validatePinSession(request)
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 })
    }

    const { client_id } = sessionResult
    const { id: assistantId } = await params
    
    if (!assistantId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_ASSISTANT_ID', message: 'Assistant ID is required' }
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient('assistant_analytics')

    // Verify client owns this assistant and get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('client_assistants')
      .select('id, client_id, display_name, vapi_assistant_id')
      .eq('id', assistantId)
      .eq('client_id', client_id)
      .eq('is_active', true)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'ASSISTANT_NOT_FOUND', message: 'Assistant not found or access denied' }
      }, { status: 404 })
    }

    // Get all calls for this assistant using database function
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_assistant_analytics', {
        client_id_input: client_id,
        assistant_id_input: assistantId,
        days_back: 30
      })

    if (analyticsError) {
      console.error('[Assistant Analytics] Database error:', analyticsError)
      throw new Error('Failed to fetch assistant analytics')
    }

    // Get recent calls for this assistant
    const { data: recentCalls, error: callsError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('client_id', client_id)
      .eq('assistant_id', assistantId)
      .order('call_time', { ascending: false })
      .limit(50)

    if (callsError) {
      console.error('[Assistant Analytics] Calls error:', callsError)
    }

    const allCalls = recentCalls || []
    const result = analytics && analytics.length > 0 ? analytics[0] : null

    // For PIN system, structured questions come from assistant config
    const structuredQuestions = assistant.questions || []

    // Use analytics data from database function if available
    const totalCalls = result ? Number(result.total_calls) : allCalls.length
    const totalCost = result ? Number(result.total_cost_dollars) : 0
    const avgDuration = result ? Number(result.average_call_duration) : 0
    const successRate = result ? Number(result.success_rate) : 0

    // Simplified question analytics for PIN system
    const questionAnalytics = structuredQuestions.map((question: any, index: number) => ({
      question: question.question || `Question ${index + 1}`,
      structuredName: question.name || `question_${index}`,
      dataType: 'string',
      isRequired: false,
      answerRate: 0, // Would need to analyze call transcripts
      totalAnswered: 0,
      totalCalls: totalCalls
    }))

    // Format recent calls for PIN system
    const formattedRecentCalls = allCalls.map(call => ({
      id: call.id,
      callerNumber: call.caller_number || 'Unknown',
      duration: call.duration_seconds || 0,
      cost: call.cost || 0,
      startedAt: call.call_time,
      transcript: call.transcript || '',
      shortTranscript: truncateToSentence(call.transcript || ''),
      structuredData: call.structured_data || {},
      successEvaluation: call.success_evaluation,
      summary: call.summary || ''
    }))

    return NextResponse.json({
      success: true,
      data: {
        assistant: {
          id: assistant.id,
          name: assistant.display_name,
          evaluationRubric: 'boolean' // PIN system uses boolean success evaluation
        },
        metrics: {
          totalCalls,
          totalCost: Number(totalCost.toFixed(2)),
          avgDuration: Math.round(avgDuration),
          successRate: Number(successRate.toFixed(1))
        },
        structuredQuestions: questionAnalytics,
        recentCalls: formattedRecentCalls,
        dailyBreakdown: result?.daily_breakdown || [],
        recentCallsFromAnalytics: result?.recent_calls || []
      }
    })

  } catch (error) {
    console.error('GET assistant analytics error:', error)
    return handleAPIError(error)
  }
}