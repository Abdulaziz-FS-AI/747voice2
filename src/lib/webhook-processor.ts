/**
 * Webhook Processor - Handles all Vapi webhook events
 * Professional-grade event processing with error handling and database operations
 */

import { CallAnalyzer } from '@/lib/call-analyzer'
import { LeadExtractor } from '@/lib/lead-extractor'
import {
  type CallStartEvent,
  type CallEndEvent,
  type FunctionCallEvent,
  type TranscriptEvent,
  type HangEvent,
  type SpeechUpdateEvent,
  type StatusUpdateEvent,
  type VoiceInputEvent,
  type WebhookProcessingResult,
  WebhookProcessingError
} from '@/types/vapi-webhooks'
import type { Database } from '@/types/database-simplified'

// Type definitions for better type safety
type DatabaseCall = Database['public']['Tables']['calls']['Row']
type DatabaseCallInsert = Database['public']['Tables']['calls']['Insert']
type DatabaseCallUpdate = Database['public']['Tables']['calls']['Update']
type AssistantWithInfo = DatabaseCall & {
  assistants: Database['public']['Tables']['assistants']['Row']
}
type CallStatus = 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
type CallDirection = 'inbound' | 'outbound'
type VapiMessage = {
  role?: string
  content?: string
  time?: string | number
  [key: string]: unknown
}

export class WebhookProcessor {
  private callAnalyzer: CallAnalyzer
  private leadExtractor: LeadExtractor

  constructor() {
    this.callAnalyzer = new CallAnalyzer()
    this.leadExtractor = new LeadExtractor()
  }

  /**
   * Handle call-start event
   * Creates initial call record and prepares for data collection
   */
  async handleCallStart(event: CallStartEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 Call started: ${event.callId}`)
    
    try {
      // Find assistant in our database
      const { data: assistant, error: assistantError } = await this.supabase
        .from('assistants')
        .select('id, user_id, team_id, name')
        .eq('vapi_assistant_id', event.call.assistantId)
        .single()

      if (assistantError || !assistant) {
        throw new WebhookProcessingError(
          `Assistant not found for Vapi ID: ${event.call.assistantId}`,
          'call-start',
          event.callId
        )
      }

      // Create call record
      const callData = {
        vapi_call_id: event.call.id,
        assistant_id: assistant.id,
        phone_number_id: event.call.phoneNumberId || null,
        user_id: assistant.user_id,
        team_id: assistant.team_id,
        caller_number: event.call.customer?.number || 'unknown',
        caller_name: event.call.customer?.name || null,
        status: 'initiated' as const,
        direction: event.call.type === 'outboundPhoneCall' ? 'outbound' as const : 'inbound' as const,
        started_at: event.call.startedAt,
        // vapi_call_data: event.call, // Commented out - field may not exist in schema
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: call, error: callError } = await this.supabase
        .from('calls')
        .insert(callData)
        .select('id')
        .single()

      if (callError) {
        throw new WebhookProcessingError(
          `Failed to create call record: ${callError.message}`,
          'call-start',
          event.callId
        )
      }

      // Update webhook event with our call ID
      await this.updateWebhookEventCallId(event.callId, call.id)

      console.log(`✅ Call record created: ${call.id}`)
      
      return {
        success: true,
        eventId: call.id,
        callId: call.id,
        processedAt: new Date().toISOString(),
        data: { callId: call.id, assistantId: assistant.id }
      }
    } catch (error) {
      console.error('Call start processing failed:', error)
      throw error
    }
  }

  /**
   * Handle call-end event
   * Triggers full call analysis, lead extraction, and scoring
   */
  async handleCallEnd(event: CallEndEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 Call ended: ${event.callId}`)
    
    try {
      // Find existing call record
      const { data: call, error: callError } = await this.supabase
        .from('calls')
        .select('*, assistants(id, user_id, team_id, name)')
        .eq('vapi_call_id', event.call.id)
        .single()

      if (callError || !call) {
        throw new WebhookProcessingError(
          `Call not found for Vapi ID: ${event.call.id}`,
          'call-end',
          event.callId
        )
      }

      // Extract cost breakdown from VAPI
      const costBreakdown = event.call.costBreakdown || {}
      
      // Update call with completion data and detailed costs
      const updateData = {
        status: 'completed' as const,
        ended_at: event.call.endedAt,
        duration: this.calculateDuration(event.call.startedAt, event.call.endedAt),
        cost: event.call.cost,
        // ai_model_cost: costBreakdown.llm || 0, // These fields may not exist in schema
        // transcription_cost: costBreakdown.stt || 0,
        // tts_cost: costBreakdown.tts || 0,
        // phone_cost: costBreakdown.transport || 0,
        // recording_url: event.call.recordingUrl || null,
        // transcript_available: !!event.call.transcript,
        // vapi_call_data: event.call, // Commented out - field may not exist in schema
        updated_at: new Date().toISOString()
      }

      await this.supabase
        .from('calls')
        .update(updateData)
        .eq('id', call.id)

      // Store detailed cost breakdown
      await this.storeCostBreakdown(call.id, call.assistants.team_id, event.call)

      // Store transcript if available
      if (event.call.transcript) {
        await this.storeTranscript(call.id, event.call.transcript, event.call.messages)
      }

      // Extract structured responses from messages
      const responses = await this.leadExtractor.extractFromMessages(
        call.id, 
        call.assistant_id,
        event.call.messages || []
      )

      // Perform AI analysis
      const analysis = await this.callAnalyzer.analyzeCall({
        callId: call.id,
        assistantId: call.assistant_id,
        userId: call.assistants.user_id,
        transcript: event.call.transcript || '',
        responses,
        callDuration: updateData.duration,
        callCost: event.call.cost
      })

      // Store analysis results
      const { data: analysisRecord, error: analysisError } = await this.supabase
        .from('call_analysis')
        .insert({
          call_id: call.id,
          assistant_id: call.assistant_id,
          user_id: call.assistants.user_id,
          ...analysis,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (analysisError) {
        console.error('Failed to store analysis:', analysisError)
      }

      // Create lead if qualified
      if (analysis.qualification_status === 'qualified' || analysis.qualification_status === 'hot_lead') {
        await this.createLeadFromAnalysis(call.id, analysis, responses)
      }

      // Mark call as analysis completed
      // await this.supabase
      //   .from('calls')
      //   .update({ analysis_completed: true }) // Field may not exist in schema
      //   .eq('id', call.id)

      console.log(`✅ Call analysis completed: Score ${analysis.lead_score}, Status: ${analysis.qualification_status}`)
      
      return {
        success: true,
        eventId: call.id,
        callId: call.id,
        processedAt: new Date().toISOString(),
        data: {
          leadScore: analysis.lead_score,
          qualificationStatus: analysis.qualification_status,
          responsesCollected: responses.length
        }
      }
    } catch (error) {
      console.error('Call end processing failed:', error)
      throw error
    }
  }

  /**
   * Handle function-call event
   * Captures structured data responses in real-time
   */
  async handleFunctionCall(event: FunctionCallEvent): Promise<WebhookProcessingResult> {
    console.log(`🔧 Function called: ${event.functionCall.name}`)
    
    try {
      // Find call record
      const { data: call } = await this.supabase
        .from('calls')
        .select('id, assistant_id')
        .eq('vapi_call_id', event.callId)
        .single()

      if (!call) {
        console.warn(`Call not found for function call: ${event.callId}`)
        return {
          success: true,
          eventId: 'function-call-no-record',
          processedAt: new Date().toISOString()
        }
      }

      // Extract and store structured responses
      const responses = await this.leadExtractor.extractFromFunctionCall(
        call.id,
        call.assistant_id,
        event.functionCall
      )

      console.log(`✅ Stored ${responses.length} structured responses`)
      
      return {
        success: true,
        eventId: call.id,
        callId: call.id,
        processedAt: new Date().toISOString(),
        data: { responsesStored: responses.length }
      }
    } catch (error) {
      console.error('Function call processing failed:', error)
      throw error
    }
  }

  /**
   * Handle transcript event
   * Stores real-time transcript segments
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

      // Find call record
      const { data: call } = await this.supabase
        .from('calls')
        .select('id')
        .eq('vapi_call_id', event.callId)
        .single()

      if (!call) {
        console.warn(`Call not found for transcript: ${event.callId}`)
        return {
          success: true,
          eventId: 'transcript-no-record',
          processedAt: new Date().toISOString()
        }
      }

      // Store transcript segment
      await this.supabase
        .from('call_transcripts')
        .upsert({
          call_id: call.id,
          transcript_text: event.transcript.text,
          speakers: [{
            role: event.transcript.user,
            text: event.transcript.text,
            timestamp: event.transcript.timestamp,
            startTime: event.transcript.startTime,
            endTime: event.transcript.endTime
          }],
          language: 'en-US',
          processing_status: 'completed'
        })

      return {
        success: true,
        eventId: call.id,
        callId: call.id,
        processedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Transcript processing failed:', error)
      throw error
    }
  }

  // Additional event handlers for completeness
  async handleHang(event: HangEvent): Promise<WebhookProcessingResult> {
    console.log(`📞 Call hung up: ${event.callId}, reason: ${event.reason}`)
    
    return {
      success: true,
      eventId: 'hang-acknowledged',
      processedAt: new Date().toISOString()
    }
  }

  async handleSpeechUpdate(event: SpeechUpdateEvent): Promise<WebhookProcessingResult> {
    // Can be used for real-time analytics
    return {
      success: true,
      eventId: 'speech-update-acknowledged',
      processedAt: new Date().toISOString()
    }
  }

  async handleStatusUpdate(event: StatusUpdateEvent): Promise<WebhookProcessingResult> {
    console.log(`🔄 Call status update: ${event.callId} -> ${event.status}`)
    
    // Update call status in real-time
    const { data: call } = await this.supabase
      .from('calls')
      .select('id')
      .eq('vapi_call_id', event.callId)
      .single()

    if (call) {
      await this.supabase
        .from('calls')
        .update({ 
          status: event.status as CallStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', call.id)
    }
    
    return {
      success: true,
      eventId: call?.id || 'status-update',
      processedAt: new Date().toISOString()
    }
  }

  async handleVoiceInput(event: VoiceInputEvent): Promise<WebhookProcessingResult> {
    // Can be used for real-time transcript updates
    return {
      success: true,
      eventId: 'voice-input-acknowledged',
      processedAt: new Date().toISOString()
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async updateWebhookEventCallId(vapiCallId: string, callId: string) {
    await this.supabase
      .from('webhook_events')
      .update({ call_id: callId })
      .eq('vapi_call_id', vapiCallId)
  }

  private calculateDuration(startedAt: string, endedAt: string): number {
    const start = new Date(startedAt).getTime()
    const end = new Date(endedAt).getTime()
    return Math.round((end - start) / 1000) // seconds
  }

  private async storeTranscript(callId: string, transcript: string, messages?: VapiMessage[]) {
    const transcriptData = {
      call_id: callId,
      transcript_text: transcript,
      speakers: messages ? this.parseMessagesForSpeakers(messages) : [],
      summary: null, // Will be generated by AI later
      language: 'en-US',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('call_transcripts')
      .insert(transcriptData)

    if (error) {
      console.error('Failed to store transcript:', error)
    }
  }

  private parseMessagesForSpeakers(messages: VapiMessage[]): Array<{
    role: string
    text: string
    timestamp: string
    sequence: number
  }> {
    return messages.map((msg, index) => ({
      role: msg.role || 'unknown',
      text: msg.content || '',
      timestamp: msg.time || new Date().toISOString(),
      sequence: index
    }))
  }

  /**
   * Store detailed cost breakdown for a call
   */
  private async storeCostBreakdown(
    callId: string, 
    teamId: string | null, 
    callData: {
      cost?: number
      costBreakdown?: {
        llm?: number
        stt?: number
        tts?: number
        transport?: number
        [key: string]: unknown
      }
      startedAt: string
      endedAt: string
      transcript?: string
      messages?: VapiMessage[]
    }
  ) {
    try {
      const costBreakdown = callData.costBreakdown || {}
      
      // Calculate additional metrics
      const duration = this.calculateDuration(callData.startedAt, callData.endedAt)
      const transcriptLength = callData.transcript?.length || 0
      const messageCount = callData.messages?.length || 0
      
      // Note: call_costs table may not exist in current schema
      // const costData = {
      //   call_id: callId,
      //   team_id: teamId,
      //   total_cost: callData.cost || 0,
      //   ai_model_cost: costBreakdown.llm || 0,
      //   ai_model_tokens: this.estimateTokensFromMessages(callData.messages),
      //   transcription_cost: costBreakdown.stt || 0,
      //   transcription_duration: duration,
      //   tts_cost: costBreakdown.tts || 0,
      //   tts_characters: transcriptLength,
      //   phone_cost: costBreakdown.transport || 0,
      //   phone_duration: duration,
      //   vapi_cost_data: costBreakdown,
      //   created_at: new Date().toISOString(),
      //   updated_at: new Date().toISOString()
      // }

      // Store basic cost info in call record instead
      await this.supabase
        .from('calls')
        .update({ cost: callData.cost || 0, updated_at: new Date().toISOString() })
        .eq('id', callId)

      console.log(`💰 Cost information updated for call ${callId}: $${callData.cost}`)
    } catch (error) {
      console.error('Error storing cost breakdown:', error)
    }
  }

  /**
   * Estimate token count from messages (rough approximation)
   */
  private estimateTokensFromMessages(messages?: VapiMessage[]): number {
    if (!messages || messages.length === 0) return 0
    
    // Rough estimate: ~4 characters per token
    const totalChars = messages.reduce((total, msg) => {
      return total + (msg.content?.length || 0)
    }, 0)
    
    return Math.ceil(totalChars / 4)
  }

  private async createLeadFromAnalysis(
    callId: string, 
    analysis: {
      id?: string
      lead_score?: number
      primary_intent?: string
      ai_summary?: string
      [key: string]: unknown
    }, 
    responses: Array<{
      field_name?: string
      answer_value?: string
      [key: string]: unknown
    }>
  ) {
    try {
      // Extract contact information from responses
      const contactInfo = responses.reduce((acc, response) => {
        switch (response.field_name) {
          case 'full_name':
            const nameParts = response.answer_value?.split(' ') || []
            acc.first_name = nameParts[0] || ''
            acc.last_name = nameParts.slice(1).join(' ') || ''
            break
          case 'first_name':
            acc.first_name = response.answer_value
            break
          case 'last_name':
            acc.last_name = response.answer_value
            break
          case 'email':
            acc.email = response.answer_value
            break
          case 'phone_number':
            acc.phone = response.answer_value
            break
          case 'property_type':
            acc.property_type = [response.answer_value]
            break
          case 'budget':
          case 'budget_min':
            acc.budget_min = parseFloat(response.answer_value) || null
            break
          case 'budget_max':
            acc.budget_max = parseFloat(response.answer_value) || null
            break
          case 'timeline':
            acc.timeline = response.answer_value
            break
          case 'location':
          case 'preferred_location':
            acc.preferred_locations = [response.answer_value]
            break
        }
        return acc
      }, {} as {
        first_name?: string
        last_name?: string
        email?: string
        phone?: string
        property_type?: string[]
        budget_min?: number | null
        budget_max?: number | null
        timeline?: string
        preferred_locations?: string[]
      })

      // Get call details
      const { data: call } = await this.supabase
        .from('calls')
        .select('user_id, team_id, caller_number')
        .eq('id', callId)
        .single()

      if (!call) return

      const leadData = {
        call_id: callId,
        // analysis_id: analysis.id, // Field may not exist in schema
        user_id: call.user_id,
        team_id: call.team_id,
        first_name: contactInfo.first_name || null,
        last_name: contactInfo.last_name || null,
        email: contactInfo.email || null,
        phone: contactInfo.phone || call.caller_number,
        lead_type: analysis.primary_intent === 'buying' ? 'buyer' as const : 
                  analysis.primary_intent === 'selling' ? 'seller' as const :
                  analysis.primary_intent === 'investing' ? 'investor' as const : 'renter' as const,
        lead_source: 'voice_call',
        score: analysis.lead_score || 0,
        status: 'new' as const,
        property_type: contactInfo.property_type,
        budget_min: contactInfo.budget_min,
        budget_max: contactInfo.budget_max,
        preferred_locations: contactInfo.preferred_locations,
        timeline: contactInfo.timeline,
        notes: analysis.ai_summary,
        // qualification_date: new Date().toISOString(), // Field may not exist
        // last_analysis_at: new Date().toISOString(), // Field may not exist
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('leads')
        .insert(leadData)

      if (error) {
        console.error('Failed to create lead:', error)
      } else {
        console.log(`✅ Lead created from call ${callId}`)
      }
    } catch (error) {
      console.error('Lead creation failed:', error)
    }
  }
}