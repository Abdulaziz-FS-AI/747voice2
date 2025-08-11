import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

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

// Helper function to analyze success evaluation based on rubric type
function analyzeSuccessEvaluation(calls: any[], rubricType: string) {
  const breakdown: Record<string, number> = {}
  let totalEvaluated = 0
  
  calls.forEach(call => {
    if (!call.success_evaluation) return
    
    totalEvaluated++
    const evaluation = call.success_evaluation
    
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
    const { user } = await authenticateRequest()
    const { id: assistantId } = await params
    
    if (!assistantId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_ASSISTANT_ID', message: 'Assistant ID is required' }
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user owns this assistant and get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('user_assistants')
      .select('id, user_id, name, config')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'ASSISTANT_NOT_FOUND', message: 'Assistant not found or access denied' }
      }, { status: 404 })
    }

    // Get evaluation rubric from assistant config
    const evaluationRubric = assistant.config?.evaluation_rubric || 'PassFail'

    // Get all calls for this assistant from call_info_log table
    const { data: calls, error: callsError } = await supabase
      .from('call_info_log')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('started_at', { ascending: false })

    if (callsError) {
      console.error('Error fetching call info logs:', callsError)
    }

    const allCalls = calls || []

    // Get structured questions for this assistant
    const { data: structuredQuestions, error: questionsError } = await supabase
      .from('structured_questions')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('order_index')

    if (questionsError) {
      console.error('Error fetching structured questions:', questionsError)
    }

    // Calculate basic metrics
    const totalCalls = allCalls.length
    const totalCost = allCalls.reduce((sum, call) => sum + (parseFloat(call.cost) || 0), 0)
    const totalDuration = allCalls.reduce((sum, call) => sum + ((call.duration_minutes || 0) * 60), 0)
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0

    // Calculate success rate based on success_evaluation
    const evaluatedCalls = allCalls.filter(call => call.success_evaluation !== null && call.success_evaluation !== undefined)
    let successRate = 0
    
    if (evaluatedCalls.length > 0) {
      const successfulCalls = evaluatedCalls.filter(call => {
        const evaluation = call.success_evaluation
        // Determine success based on rubric type
        switch (evaluationRubric) {
          case 'PassFail':
            return evaluation === true || evaluation === 'true' || evaluation === 'Pass'
          case 'PercentageScale':
            return parseFloat(evaluation) >= 70 // Consider 70%+ as successful
          case 'DescriptiveScale':
            return evaluation === 'Excellent' || evaluation === 'Good'
          case 'LikertScale':
            return evaluation === 'Strongly Agree' || evaluation === 'Agree'
          default:
            return !!evaluation
        }
      })
      successRate = (successfulCalls.length / evaluatedCalls.length) * 100
    }

    // Analyze structured questions completion rates
    const questionAnalytics = (structuredQuestions || []).map(question => {
      const answeredCalls = allCalls.filter(call => {
        const structuredData = call.structured_data || {}
        const answer = structuredData[question.structured_name]
        return answer !== null && answer !== undefined && answer !== ''
      })
      
      const answerRate = totalCalls > 0 ? (answeredCalls.length / totalCalls) * 100 : 0
      
      return {
        question: question.question_text,
        structuredName: question.structured_name,
        dataType: question.data_type,
        isRequired: question.is_required,
        answerRate: Math.round(answerRate * 10) / 10, // Round to 1 decimal
        totalAnswered: answeredCalls.length,
        totalCalls: totalCalls
      }
    })

    // Format recent calls with truncated transcripts
    const recentCalls = allCalls.slice(0, 50).map(call => ({
      id: call.id,
      callerNumber: call.caller_number || 'Unknown',
      duration: (call.duration_minutes || 0) * 60, // Convert minutes back to seconds for display
      cost: parseFloat(call.cost) || 0,
      startedAt: call.started_at,
      transcript: call.transcript || '',
      shortTranscript: truncateToSentence(call.transcript || ''),
      structuredData: call.structured_data || {},
      successEvaluation: call.success_evaluation,
      summary: call.summary || ''
    }))

    // Analyze success evaluation breakdown
    const successAnalysis = analyzeSuccessEvaluation(allCalls, evaluationRubric)

    return NextResponse.json({
      success: true,
      data: {
        assistant: {
          id: assistant.id,
          name: assistant.name,
          evaluationRubric: evaluationRubric
        },
        metrics: {
          totalCalls,
          totalCost: Number(totalCost.toFixed(2)),
          avgDuration: Math.round(avgDuration),
          successRate: Number(successRate.toFixed(1))
        },
        structuredQuestions: questionAnalytics,
        recentCalls,
        successAnalysis: {
          rubricType: evaluationRubric,
          breakdown: successAnalysis.breakdown,
          totalEvaluated: successAnalysis.totalEvaluated
        }
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