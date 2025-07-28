/**
 * Lead Extractor - Parses Vapi messages and function calls to extract structured data
 * Converts conversation data into database records for analysis
 */

import type { Database } from '@/types/database-simplified'

// LeadResponse type simplified for standalone version
type LeadResponse = {
  id?: string
  lead_id: string
  question_id: string  
  response_text: string
  confidence_score?: number
  created_at?: string
}

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
  // Supabase dependency removed for standalone version

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

    // Mock assistant questions for standalone version
    const questionMap = new Map([
      ['name', { question_text: 'What is your name?', structured_field_name: 'name' }],
      ['email', { question_text: 'What is your email?', structured_field_name: 'email' }],
      ['phone', { question_text: 'What is your phone number?', structured_field_name: 'phone' }],
      ['company', { question_text: 'What company do you work for?', structured_field_name: 'company' }]
    ])

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

      // Mock storage for standalone version - data would be stored in database
      console.log(`📝 Mock storage: ${fieldName} = ${response.answerValue}`)
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

        // Mock storage for standalone version - data would be stored in database
        console.log(`📝 Mock storage from transcript: ${pattern.field} = ${response.answerValue}`)
      }
    }

    console.log(`✅ Extracted ${responses.length} responses from transcript`)
    
    return responses
  }

  /**
   * Mock response storage for standalone version
   */
  private async storeResponse(response: LeadResponse): Promise<void> {
    try {
      // Mock storage - in production this would be saved to database
      console.log('📝 Mock response storage:', response)
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
   * Get all responses for a call (mock version for standalone)
   */
  async getCallResponses(callId: string): Promise<ExtractedResponse[]> {
    // Mock responses for standalone version
    return [
      {
        questionText: 'What is your name?',
        answerValue: 'John Smith',
        fieldName: 'name',
        answerType: 'text',
        confidence: 0.95,
        collectedAt: new Date().toISOString(),
        functionName: 'collect_info',
        vapiMessageId: undefined
      }
    ]
  }

  /**
   * Calculate completion rate for assistant questions
   */
  async calculateCompletionRate(callId: string, assistantId: string): Promise<number> {
    // Mock completion rate for standalone version
    return 75 // 75% completion rate
  }
}