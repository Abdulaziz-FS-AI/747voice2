/**
 * PIN Webhook Processor - Handles VAPI webhook events for PIN-based client system
 * Simplified event processing focused on call logging and analytics
 */

import { createServiceRoleClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

// Type definitions for VAPI webhook events
interface VapiCall {
  id: string
  assistantId: string
  phoneNumberId?: string
  customerId?: string
  type?: string
  startedAt: string
  endedAt?: string
  cost?: number
  transcript?: string
  messages?: Array<{
    role?: string
    content?: string
    time?: string | number
    [key: string]: unknown
  }>
  costBreakdown?: {
    llm?: number
    stt?: number
    tts?: number
    transport?: number
    [key: string]: unknown
  }
  recordingUrl?: string
  [key: string]: unknown
}

interface CallStartEvent {
  type: 'call-start'
  callId: string
  call: VapiCall
  [key: string]: unknown
}

interface CallEndEvent {
  type: 'call-end'
  callId: string
  call: VapiCall
  [key: string]: unknown
}

interface StatusUpdateEvent {
  type: 'status-update'
  callId: string
  status: string
  [key: string]: unknown
}

interface TranscriptEvent {
  type: 'transcript'
  callId: string
  transcript: {
    type: 'partial' | 'final'
    text: string
    user: string
    timestamp: string
    startTime?: number
    endTime?: number
  }
  [key: string]: unknown
}

interface WebhookProcessingResult {
  success: boolean
  eventId?: string
  callId?: string
  processedAt: string
  data?: Record<string, unknown>
}

export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public eventType: string,
    public callId?: string
  ) {
    super(message)
    this.name = 'WebhookProcessingError'
  }
}

type Supabase = ReturnType<typeof createServiceRoleClient>

export class PinWebhookProcessor {
  private supabase: Supabase

  constructor() {
    this.supabase = createServiceRoleClient()
  }

  /**
   * Handle call-start event
   * Creates initial call record for client's assistant
   */
  async handleCallStart(event: CallStartEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 [PIN] Call started: ${event.callId}`)
    
    try {
      // Find client assistant by VAPI assistant ID
      const { data: clientAssistant, error: assistantError } = await this.supabase
        .from('client_assistants')
        .select('id, client_id, display_name')
        .eq('vapi_assistant_id', event.call.assistantId)
        .eq('is_active', true)
        .single()

      if (assistantError || !clientAssistant) {
        throw new WebhookProcessingError(
          `Client assistant not found for VAPI ID: ${event.call.assistantId}`,
          'call-start',
          event.callId
        )
      }

      // Find client phone number if provided
      let phoneNumberId: string | null = null
      if (event.call.phoneNumberId) {
        const { data: phoneNumber } = await this.supabase
          .from('client_phone_numbers')
          .select('id')
          .eq('vapi_phone_id', event.call.phoneNumberId)
          .eq('client_id', clientAssistant.client_id)
          .eq('is_active', true)
          .single()
        
        phoneNumberId = phoneNumber?.id || null
      }

      // Create call log record
      const callData = {
        client_id: clientAssistant.client_id,
        assistant_id: clientAssistant.id,
        phone_number_id: phoneNumberId,
        vapi_call_id: event.call.id,
        caller_number: event.call.customerId || null,
        call_status: 'in_progress' as const,
        call_type: event.call.type === 'outboundPhoneCall' ? 'outbound' as const : 'inbound' as const,
        call_time: event.call.startedAt,
        assistant_display_name: clientAssistant.display_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: callLog, error: callError } = await this.supabase
        .from('call_logs')
        .insert(callData)
        .select('id')
        .single()

      if (callError) {
        throw new WebhookProcessingError(
          `Failed to create call log: ${callError.message}`,
          'call-start',
          event.callId
        )
      }

      console.log(`✅ [PIN] Call log created: ${callLog.id}`)
      
      return {
        success: true,
        eventId: callLog.id,
        callId: callLog.id,
        processedAt: new Date().toISOString(),
        data: { 
          callLogId: callLog.id, 
          clientId: clientAssistant.client_id,
          assistantId: clientAssistant.id
        }
      }
    } catch (error) {
      console.error('[PIN] Call start processing failed:', error)
      throw error
    }
  }

  /**
   * Handle call-end event
   * Updates call record with completion data and basic analytics
   */
  async handleCallEnd(event: CallEndEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 [PIN] Call ended: ${event.callId}`)
    
    try {
      // Find existing call log record
      const { data: callLog, error: callError } = await this.supabase
        .from('call_logs')
        .select('*')
        .eq('vapi_call_id', event.call.id)
        .single()

      if (callError || !callLog) {
        throw new WebhookProcessingError(
          `Call log not found for VAPI ID: ${event.call.id}`,
          'call-end',
          event.callId
        )
      }

      // Calculate call duration
      const durationSeconds = event.call.endedAt ? 
        this.calculateDuration(event.call.startedAt, event.call.endedAt) : 0

      // Update call log with completion data
      const updateData = {
        call_status: 'completed' as const,
        duration_seconds: durationSeconds,
        end_time: event.call.endedAt || new Date().toISOString(),
        cost: event.call.cost || 0,
        recording_url: event.call.recordingUrl || null,
        transcript: event.call.transcript || null,
        updated_at: new Date().toISOString()
      }

      await this.supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', callLog.id)

      // Store analytics data if we have meaningful information
      if (durationSeconds > 0 || event.call.cost) {
        await this.storeCallAnalytics(
          callLog.id,
          callLog.client_id,
          callLog.assistant_id,
          {
            durationSeconds,
            cost: event.call.cost || 0,
            transcript: event.call.transcript || null,
            hasRecording: !!event.call.recordingUrl,
            callCompleted: true
          }
        )
      }

      console.log(`✅ [PIN] Call completed: ${durationSeconds}s, $${event.call.cost || 0}`)
      
      return {
        success: true,
        eventId: callLog.id,
        callId: callLog.id,
        processedAt: new Date().toISOString(),
        data: {
          durationSeconds,
          cost: event.call.cost || 0,
          hasRecording: !!event.call.recordingUrl,
          hasTranscript: !!event.call.transcript
        }
      }
    } catch (error) {
      console.error('[PIN] Call end processing failed:', error)
      throw error
    }
  }

  /**
   * Handle status update event
   * Updates call status in real-time
   */
  async handleStatusUpdate(event: StatusUpdateEvent): Promise<WebhookProcessingResult> {
    console.log(`🔄 [PIN] Call status update: ${event.callId} -> ${event.status}`)
    
    try {
      const { data: callLog } = await this.supabase
        .from('call_logs')
        .select('id')
        .eq('vapi_call_id', event.callId)
        .single()

      if (callLog) {
        // Map VAPI status to our status values
        const mappedStatus = this.mapVapiStatus(event.status)
        
        await this.supabase
          .from('call_logs')
          .update({ 
            call_status: mappedStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', callLog.id)
      }
      
      return {
        success: true,
        eventId: callLog?.id || 'status-update',
        processedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[PIN] Status update processing failed:', error)
      throw error
    }
  }

  /**
   * Handle transcript event
   * Store transcript segments for completed calls
   */
  async handleTranscript(event: TranscriptEvent): Promise<WebhookProcessingResult> {
    try {
      // Only process final transcripts to avoid duplicates
      if (event.transcript.type !== 'final') {
        return {
          success: true,
          eventId: 'transcript-partial',
          processedAt: new Date().toISOString()
        }
      }

      const { data: callLog } = await this.supabase
        .from('call_logs')
        .select('id, transcript')
        .eq('vapi_call_id', event.callId)
        .single()

      if (callLog) {
        // Append to existing transcript or create new one
        const existingTranscript = callLog.transcript || ''
        const updatedTranscript = existingTranscript + 
          (existingTranscript ? '\n' : '') + 
          `${event.transcript.user}: ${event.transcript.text}`

        await this.supabase
          .from('call_logs')
          .update({ 
            transcript: updatedTranscript,
            updated_at: new Date().toISOString()
          })
          .eq('id', callLog.id)
      }

      return {
        success: true,
        eventId: callLog?.id || 'transcript-no-record',
        processedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('[PIN] Transcript processing failed:', error)
      throw error
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateDuration(startedAt: string, endedAt: string): number {
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    return Math.round((end - start) / 1000) // seconds
  }

  private mapVapiStatus(vapiStatus: string): 'in_progress' | 'completed' | 'failed' | 'cancelled' {
    switch (vapiStatus.toLowerCase()) {
      case 'completed':
      case 'ended':
        return 'completed'
      case 'failed':
      case 'error':
        return 'failed'
      case 'cancelled':
      case 'canceled':
        return 'cancelled'
      default:
        return 'in_progress'
    }
  }

  private async storeCallAnalytics(
    callLogId: string,
    clientId: string,
    assistantId: string,
    analytics: {
      durationSeconds: number
      cost: number
      transcript: string | null
      hasRecording: boolean
      callCompleted: boolean
    }
  ) {
    try {
      const analyticsData = {
        call_log_id: callLogId,
        client_id: clientId,
        assistant_id: assistantId,
        duration_seconds: analytics.durationSeconds,
        cost: analytics.cost,
        success_evaluation: analytics.callCompleted,
        has_recording: analytics.hasRecording,
        has_transcript: !!analytics.transcript,
        transcript_length: analytics.transcript?.length || 0,
        created_at: new Date().toISOString()
      }

      await this.supabase
        .from('call_analytics')
        .insert(analyticsData)

      console.log(`📊 [PIN] Analytics stored for call ${callLogId}`)
    } catch (error) {
      console.error('[PIN] Failed to store analytics:', error)
    }
  }

  /**
   * Process any webhook event
   */
  async processWebhookEvent(
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<WebhookProcessingResult> {
    try {
      switch (eventType) {
        case 'call-start':
          return await this.handleCallStart(eventData as CallStartEvent)
        
        case 'call-end':
          return await this.handleCallEnd(eventData as CallEndEvent)
        
        case 'status-update':
          return await this.handleStatusUpdate(eventData as StatusUpdateEvent)
        
        case 'transcript':
          return await this.handleTranscript(eventData as TranscriptEvent)
        
        default:
          console.log(`[PIN] Unhandled event type: ${eventType}`)
          return {
            success: true,
            eventId: `unhandled-${eventType}`,
            processedAt: new Date().toISOString(),
            data: { eventType, message: 'Event acknowledged but not processed' }
          }
      }
    } catch (error) {
      console.error(`[PIN] Error processing ${eventType}:`, error)
      
      if (error instanceof WebhookProcessingError) {
        throw error
      }
      
      throw new WebhookProcessingError(
        `Failed to process ${eventType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        eventType,
        eventData.callId as string
      )
    }
  }
}