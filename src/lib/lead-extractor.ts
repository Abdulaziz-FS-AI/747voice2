/**
 * Lead Extractor - Parses Vapi messages and function calls to extract structured data
 * Converts conversation data into database records for analysis
 */

import { createServiceRoleClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type LeadResponse = Database['public']['Tables']['lead_responses']['Insert']

export interface ExtractedResponse {
  questionText: string
  answerValue: string
  fieldName: string
  answerType: string
  confidence: number
  collectedAt: string
  functionName?: string
  vapiMessageId?: string
}

export interface ExtractionResult {
  responses: ExtractedResponse[]
  totalExtracted: number
  confidence: number
}

export class LeadExtractor {
  private supabase = createServiceRoleClient()

  /**
   * Extract structured data from Vapi function calls
   */
  async extractFromFunctionCall(
    callId: string,
    assistantId: string,
    functionCall: {
      name: string
      parameters: Record<string, any>
      result?: any
    }
  ): Promise<ExtractedResponse[]> {
    console.log(`🔍 Extracting from function: ${functionCall.name}`)
    
    const responses: ExtractedResponse[] = []
    const collectedAt = new Date().toISOString()

    // Get assistant questions for mapping
    const { data: assistantQuestions } = await this.supabase
      .from('assistant_questions')
      .select('*')
      .eq('assistant_id', assistantId)

    const questionMap = new Map(
      assistantQuestions?.map(q => [q.structured_field_name, q]) || []
    )

    // Process each parameter from the function call
    for (const [fieldName, value] of Object.entries(functionCall.parameters)) {
      if (!value || value === '') continue

      const question = questionMap.get(fieldName)
      const response: ExtractedResponse = {
        questionText: question?.question_text || `Dynamic field: ${fieldName}`,
        answerValue: this.normalizeValue(value),
        fieldName,
        answerType: this.detectAnswerType(value),
        confidence: 0.95, // High confidence for function calls
        collectedAt,
        functionName: functionCall.name
      }

      responses.push(response)

      // Store in database
      await this.storeResponse({
        call_id: callId,
        assistant_id: assistantId,
        question_id: question?.id || null,
        function_name: functionCall.name,
        question_text: response.questionText,
        answer_value: response.answerValue,
        answer_type: response.answerType,
        answer_confidence: response.confidence,
        field_name: fieldName,
        is_required: question?.is_required || false,
        collection_method: 'function_call',
        collected_at: collectedAt
      })
    }

    console.log(`✅ Extracted ${responses.length} responses from function call`)
    
    return responses
  }

  /**
   * Extract structured data from Vapi message array
   * Used during call-end processing
   */
  async extractFromMessages(
    callId: string,
    assistantId: string,
    messages: any[]
  ): Promise<ExtractedResponse[]> {
    console.log(`🔍 Extracting from ${messages.length} messages`)
    
    const responses: ExtractedResponse[] = []
    const functionCallMessages = messages.filter(msg => 
      msg.type === 'function-call' && msg.functionCall
    )

    for (const message of functionCallMessages) {
      const extracted = await this.extractFromFunctionCall(
        callId,
        assistantId,
        {
          name: message.functionCall.name,
          parameters: message.functionCall.parameters,
          result: message.result
        }
      )
      
      responses.push(...extracted)
    }

    // Also extract from transcript using NLP if available
    const transcriptMessages = messages.filter(msg => 
      msg.role === 'user' && msg.content
    )
    
    if (transcriptMessages.length > 0) {
      const nlpExtracted = await this.extractFromTranscript(
        callId,
        assistantId,
        transcriptMessages
      )
      responses.push(...nlpExtracted)
    }

    return this.deduplicateResponses(responses)
  }

  /**
   * Extract data from transcript using NLP patterns
   * Fallback method when function calls are not used
   */
  async extractFromTranscript(
    callId: string,
    assistantId: string,
    messages: any[]
  ): Promise<ExtractedResponse[]> {
    const responses: ExtractedResponse[] = []
    const fullTranscript = messages.map(m => m.content).join(' ')

    // Common patterns for real estate conversations
    const patterns = [
      {
        field: 'full_name',
        regex: /(?:my name is|i'm|i am)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i,
        question: 'What is your full name?'
      },
      {
        field: 'phone_number',
        regex: /(?:my number is|phone number is|call me at)\s*([\d\s\-\(\)\+]{10,})/i,
        question: 'What is your phone number?'
      },
      {
        field: 'email',
        regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        question: 'What is your email address?'
      },
      {
        field: 'property_type',
        regex: /(?:looking for|interested in|want to buy)\s+(?:a\s+)?(house|condo|apartment|townhouse|commercial|land)/i,
        question: 'What type of property are you interested in?'
      },
      {
        field: 'budget',
        regex: /budget\s+(?:is|of|around)?\s*\$?([\d,]+(?:\.\d{2})?)/i,
        question: 'What is your budget range?'
      },
      {
        field: 'location',
        regex: /(?:in|around|near)\s+([A-Za-z\s]+(?:,\s*[A-Z]{2})?)/i,
        question: 'What area are you looking in?'
      },
      {
        field: 'timeline',
        regex: /(?:timeline|timeframe|when).*?(immediately|asap|next month|few months|next year|no rush)/i,
        question: 'What is your timeline?'
      }
    ]

    for (const pattern of patterns) {
      const match = fullTranscript.match(pattern.regex)
      if (match && match[1]) {
        const response: ExtractedResponse = {
          questionText: pattern.question,
          answerValue: match[1].trim(),
          fieldName: pattern.field,
          answerType: 'string',
          confidence: 0.75, // Lower confidence for NLP extraction
          collectedAt: new Date().toISOString()
        }

        responses.push(response)

        // Store in database
        await this.storeResponse({
          call_id: callId,
          assistant_id: assistantId,
          question_id: null,
          function_name: null,
          question_text: response.questionText,
          answer_value: response.answerValue,
          answer_type: response.answerType,
          answer_confidence: response.confidence,
          field_name: pattern.field,
          is_required: false,
          collection_method: 'transcript_analysis',
          collected_at: response.collectedAt
        })
      }
    }

    console.log(`✅ Extracted ${responses.length} responses from transcript`)
    
    return responses
  }

  /**
   * Store response in database
   */
  private async storeResponse(response: LeadResponse): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('lead_responses')
        .insert(response)

      if (error) {
        console.error('Failed to store response:', error)
      }
    } catch (error) {
      console.error('Response storage error:', error)
    }
  }

  /**
   * Normalize answer values for consistent storage
   */
  private normalizeValue(value: any): string {
    if (typeof value === 'string') {
      return value.trim()
    }
    if (typeof value === 'number') {
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    return String(value)
  }

  /**
   * Detect the type of answer value
   */
  private detectAnswerType(value: any): string {
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) return 'array'
    return 'string'
  }

  /**
   * Remove duplicate responses based on field name
   */
  private deduplicateResponses(responses: ExtractedResponse[]): ExtractedResponse[] {
    const seen = new Map<string, ExtractedResponse>()
    
    for (const response of responses) {
      const existing = seen.get(response.fieldName)
      if (!existing || response.confidence > existing.confidence) {
        seen.set(response.fieldName, response)
      }
    }

    return Array.from(seen.values())
  }

  /**
   * Get all responses for a call
   */
  async getCallResponses(callId: string): Promise<ExtractedResponse[]> {
    const { data, error } = await this.supabase
      .from('lead_responses')
      .select('*')
      .eq('call_id', callId)
      .order('collected_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch call responses:', error)
      return []
    }

    return data.map(response => ({
      questionText: response.question_text,
      answerValue: response.answer_value || '',
      fieldName: response.field_name || '',
      answerType: response.answer_type,
      confidence: response.answer_confidence || 0,
      collectedAt: response.collected_at || response.created_at,
      functionName: response.function_name,
      vapiMessageId: response.vapi_message_id
    }))
  }

  /**
   * Calculate completion rate for assistant questions
   */
  async calculateCompletionRate(callId: string, assistantId: string): Promise<number> {
    // Get total questions for this assistant
    const { count: totalQuestions } = await this.supabase
      .from('assistant_questions')
      .select('id', { count: 'exact', head: true })
      .eq('assistant_id', assistantId)

    // Get answered questions for this call
    const { count: answeredQuestions } = await this.supabase
      .from('lead_responses')
      .select('id', { count: 'exact', head: true })
      .eq('call_id', callId)
      .not('answer_value', 'is', null)
      .neq('answer_value', '')

    if (!totalQuestions || totalQuestions === 0) return 0
    
    return Math.round((answeredQuestions || 0) / totalQuestions * 100)
  }
}