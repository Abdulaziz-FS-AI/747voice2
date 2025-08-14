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
      // Use database function to log call with automatic client lookup
      const { data: result, error } = await this.supabase
        .rpc('log_vapi_call', {
          vapi_call_id_input: event.call.id,
          vapi_assistant_id_input: event.call.assistantId,
          vapi_phone_id_input: event.call.phoneNumberId || null,
          caller_number_input: event.call.customerId || null,
          call_status_input: 'in_progress',
          call_type_input: event.call.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
          call_time_input: event.call.startedAt
        })

      if (error) {
        throw new WebhookProcessingError(
          `Failed to log call start: ${error.message}`,
          'call-start',
          event.callId
        )
      }

      const callResult = result?.[0]
      if (!callResult?.success) {
        throw new WebhookProcessingError(
          callResult?.message || 'Failed to log call start',
          'call-start', 
          event.callId
        )
      }

      console.log(`✅ [PIN] Call logged: ${callResult.call_log_id}`)
      
      return {
        success: true,
        eventId: callResult.call_log_id,
        callId: callResult.call_log_id,
        processedAt: new Date().toISOString(),
        data: { 
          callLogId: callResult.call_log_id, 
          clientId: callResult.client_id
        }
      }
    } catch (error) {
      console.error('[PIN] Call start processing failed:', error)
      throw error
    }
  }

  /**
   * Handle call-end event
   * Updates call record with completion data and analytics
   */
  async handleCallEnd(event: CallEndEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 [PIN] Call ended: ${event.callId}`)
    
    try {
      // Calculate call duration
      const durationSeconds = event.call.endedAt ? 
        this.calculateDuration(event.call.startedAt, event.call.endedAt) : 0

      // Use database function to update call with completion data
      const { data: result, error } = await this.supabase
        .rpc('log_vapi_call', {
          vapi_call_id_input: event.call.id,
          vapi_assistant_id_input: event.call.assistantId,
          call_status_input: 'completed',
          duration_seconds_input: durationSeconds,
          cost_input: event.call.cost || 0,
          transcript_input: event.call.transcript || null,
          recording_url_input: event.call.recordingUrl || null,
          success_evaluation_input: durationSeconds > 30 // Basic success criteria
        })

      if (error) {
        throw new WebhookProcessingError(
          `Failed to update call completion: ${error.message}`,
          'call-end',
          event.callId
        )
      }

      const callResult = result?.[0]
      if (!callResult?.success) {
        throw new WebhookProcessingError(
          callResult?.message || 'Failed to update call completion',
          'call-end',
          event.callId
        )
      }

      console.log(`✅ [PIN] Call completed: ${durationSeconds}s, $${event.call.cost || 0}`)
      
      return {
        success: true,
        eventId: callResult.call_log_id,
        callId: callResult.call_log_id,
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
      const { data: updated, error } = await this.supabase
        .rpc('update_call_status', {
          vapi_call_id_input: event.callId,
          status_input: event.status
        })

      if (error) {
        console.error('[PIN] Status update failed:', error)
      }
      
      return {
        success: true,
        eventId: 'status-update',
        processedAt: new Date().toISOString(),
        data: { updated: updated || false }
      }
    } catch (error) {
      console.error('[PIN] Status update processing failed:', error)
      throw error
    }
  }

  /**
   * Handle transcript event
   * Store transcript segments for calls
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

      const { data: updated, error } = await this.supabase
        .rpc('append_call_transcript', {
          vapi_call_id_input: event.callId,
          transcript_segment_input: event.transcript.text,
          speaker_input: event.transcript.user || 'user'
        })

      if (error) {
        console.error('[PIN] Transcript append failed:', error)
      }

      return {
        success: true,
        eventId: 'transcript-updated',
        processedAt: new Date().toISOString(),
        data: { updated: updated || false }
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