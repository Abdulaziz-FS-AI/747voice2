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
  duration_seconds: number      // Call duration in seconds
  caller_number?: string        // Caller's phone number
  started_at: string           // Start timestamp (ISO format)
  transcript?: string          // Call transcript
  structured_data?: Record<string, any> // JSONB structured data
  success_evaluation?: string   // Success evaluation text
  summary?: string             // Call summary text
  cost: number                 // Cost (integer, cents or dollars)
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
    
    logger.info('Received Make.com call report', {
      correlationId,
      vapiCallId: payload.id,
      assistantId: payload.assistant_id,
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
        vapiCallId: payload.id,
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
    if (payload.caller_number) {
      const { data: phoneNumber } = await supabase
        .from('user_phone_numbers')
        .select('id')
        .eq('phone_number', payload.caller_number)
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
        vapi_call_id: payload.id,
        duration_seconds: payload.duration_seconds,
        cost_cents: Math.round(payload.cost * 100), // Convert to cents if needed
        caller_number: payload.caller_number,
        started_at: payload.started_at,
        transcript: payload.transcript,
        structured_data: payload.structured_data || {},
        success_evaluation: payload.success_evaluation,
        summary: payload.summary
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