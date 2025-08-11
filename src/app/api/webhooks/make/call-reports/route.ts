/**
 * Make.com Webhook Handler for VAPI Call Reports
 * 
 * This endpoint receives parsed call data from Make.com and stores it in Supabase.
 * Make.com handles the parsing of VAPI end-of-call-report webhooks and sends
 * structured data to this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { LoggerService } from '@/lib/services/logger.service'

interface MakeCallReportPayload {
  // Exact structure as received from Make.com
  id: string                    // VAPI call ID (UUID)
  assistant_id: string          // VAPI assistant ID (UUID)
  duration_seconds: number      // Call duration in seconds (will convert to minutes)
  caller_number?: string        // Caller's phone number
  started_at: string           // Start timestamp (ISO format)
  ended_at?: string            // End timestamp (ISO format)
  transcript?: string          // Call transcript
  structured_data?: Record<string, any> // JSONB structured data
  success_evaluation?: string   // Success evaluation text
  summary?: string             // Call summary text
  cost: number                 // Cost (dollars or cents)
  status?: string              // Call status (completed, failed, etc.)
}

const logger = LoggerService.getInstance()

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  
  try {
    // DEBUG: Log that webhook was called
    console.log('🔥 [MAKE WEBHOOK] Received request', {
      correlationId,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      url: request.url
    })
    // Verify Make.com webhook secret
    const authHeader = request.headers.get('x-make-apikey')
    if (authHeader !== process.env.MAKE_WEBHOOK_SECRET) {
      logger.warn('Unauthorized Make.com webhook attempt', {
        correlationId,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent')
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the payload from Make.com
    const payload: MakeCallReportPayload = await request.json()
    
    // DEBUG: Log the full payload
    console.log('🔥 [MAKE WEBHOOK] Full payload received:', {
      correlationId,
      payload: JSON.stringify(payload, null, 2)
    })
    
    logger.info('Received Make.com call report', {
      correlationId,
      vapiCallId: payload.id,
      assistantId: payload.assistant_id,
      duration: payload.duration_seconds,
      status: payload.status
    })

    // Create Supabase client
    const supabase = await createServerSupabaseClient()

    // Find the assistant and user info
    const { data: assistant, error: assistantError } = await supabase
      .from('user_assistants')
      .select('id, user_id, vapi_assistant_id')
      .eq('vapi_assistant_id', payload.assistant_id)
      .single()

    if (assistantError || !assistant) {
      logger.error('Assistant not found for call report', {
        correlationId,
        vapiCallId: payload.id,
        assistantId: payload.assistant_id,
        error: assistantError?.message
      })
      
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      )
    }

    // Convert status to evaluation
    const mapStatusToEvaluation = (status?: string): 'excellent' | 'good' | 'average' | 'poor' | 'pending' | 'failed' => {
      if (!status) return 'pending'
      switch (status.toLowerCase()) {
        case 'completed':
        case 'success':
          return 'good'
        case 'failed':
        case 'error':
          return 'failed'
        case 'timeout':
        case 'no_answer':
          return 'poor'
        default:
          return 'pending'
      }
    }

    // Insert call log using NEW SCHEMA (no user_id, duration_minutes, evaluation)
    const { data: callLog, error: insertError } = await supabase
      .from('call_info_log')
      .insert({
        assistant_id: assistant.id,  // No user_id - use assistant_id relationship
        vapi_call_id: payload.id,
        duration_minutes: Math.ceil(payload.duration_seconds / 60), // Convert seconds to minutes
        evaluation: mapStatusToEvaluation(payload.status), // Map status to evaluation
        caller_number: payload.caller_number,
        started_at: payload.started_at,
        ended_at: payload.ended_at || new Date().toISOString(),
        transcript: payload.transcript,
        structured_data: payload.structured_data || {},
        summary: payload.summary
        // Note: cost field removed - not in current call_logs schema
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to insert call log', {
        correlationId,
        vapiCallId: payload.id,
        error: insertError.message
      })
      
      return NextResponse.json(
        { error: 'Failed to store call log' },
        { status: 500 }
      )
    }

    logger.info('Call log stored successfully', {
      correlationId,
      vapiCallId: payload.id,
      callLogId: callLog.id,
      userId: assistant.user_id
    })

    // The trigger function will automatically update user usage and call_analytics
    return NextResponse.json({
      success: true,
      call_log_id: callLog.id,
      message: 'Call report processed successfully'
    })

  } catch (error) {
    logger.error('Make.com webhook processing failed', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for testing webhook connectivity
export async function GET() {
  const timestamp = new Date().toISOString()
  console.log('🔥 [MAKE WEBHOOK] GET request received at', timestamp)
  
  return NextResponse.json({
    message: 'Make.com webhook endpoint is working',
    timestamp,
    endpoint: '/api/webhooks/make/call-reports',
    methods: ['POST'],
    expectedHeaders: ['x-make-apikey'],
    status: 'healthy'
  })
}