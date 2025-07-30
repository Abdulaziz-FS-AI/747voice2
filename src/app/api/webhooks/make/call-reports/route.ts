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
  // Call identification
  vapi_call_id: string
  assistant_id: string
  phone_number?: string
  
  // Call details
  call_status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'cancelled'
  started_at: string
  ended_at: string
  duration_seconds: number
  cost_cents: number
  
  // Call content
  transcript?: string
  caller_number?: string
  
  // Structured data collected during call
  structured_data?: Record<string, any>
  
  // Success evaluation from VAPI
  success_evaluation?: Record<string, any>
  
  // Raw VAPI payload for debugging
  raw_payload: Record<string, any>
}

const logger = LoggerService.getInstance()

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  
  try {
    // Verify Make.com webhook secret
    const authHeader = request.headers.get('x-make-apikey')
    if (authHeader !== process.env.MAKE_WEBHOOK_SECRET) {
      logger.warn('Unauthorized Make.com webhook attempt', {
        correlationId,
        ip: request.ip,
        userAgent: request.headers.get('user-agent')
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the payload from Make.com
    const payload: MakeCallReportPayload = await request.json()
    
    logger.info('Received Make.com call report', {
      correlationId,
      vapiCallId: payload.vapi_call_id,
      assistantId: payload.assistant_id,
      callStatus: payload.call_status,
      duration: payload.duration_seconds
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
        vapiCallId: payload.vapi_call_id,
        assistantId: payload.assistant_id,
        error: assistantError?.message
      })
      
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      )
    }

    // Find phone number if provided
    let phoneNumberId = null
    if (payload.phone_number) {
      const { data: phoneNumber } = await supabase
        .from('user_phone_numbers')
        .select('id')
        .eq('phone_number', payload.phone_number)
        .eq('user_id', assistant.user_id)
        .single()
      
      phoneNumberId = phoneNumber?.id || null
    }

    // Insert call log
    const { data: callLog, error: insertError } = await supabase
      .from('call_logs')
      .insert({
        user_id: assistant.user_id,
        assistant_id: assistant.id,
        phone_number_id: phoneNumberId,
        vapi_call_id: payload.vapi_call_id,
        call_status: payload.call_status,
        duration_seconds: payload.duration_seconds,
        cost_cents: payload.cost_cents,
        caller_number: payload.caller_number,
        started_at: payload.started_at,
        ended_at: payload.ended_at,
        transcript: payload.transcript,
        structured_data: payload.structured_data || {},
        success_evaluation: payload.success_evaluation || {},
        raw_payload: payload.raw_payload
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Failed to insert call log', {
        correlationId,
        vapiCallId: payload.vapi_call_id,
        error: insertError.message
      })
      
      return NextResponse.json(
        { error: 'Failed to store call log' },
        { status: 500 }
      )
    }

    logger.info('Call log stored successfully', {
      correlationId,
      vapiCallId: payload.vapi_call_id,
      callLogId: callLog.id,
      userId: assistant.user_id
    })

    // The trigger function will automatically update call_analytics
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

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}