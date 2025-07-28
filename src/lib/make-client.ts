/**
 * Make.com (Integromat) Webhook Client
 * Sends assistant data to Make.com for processing before Vapi
 */

import { z } from 'zod'

// Make.com webhook response schema
const makeWebhookResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    vapiAssistantId: z.string().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }).optional(),
})

export type MakeWebhookResponse = z.infer<typeof makeWebhookResponseSchema>

// Assistant data structure for Make.com
export interface MakeAssistantPayload {
  // Assistant Basic Info
  assistant: {
    id: string
    name: string
    agentName: string
    companyName: string
    tone: 'professional' | 'friendly' | 'casual'
    language: string
    maxCallDuration: number
  }
  
  // Voice Configuration
  voice: {
    provider: string
    voiceId: string
  }
  
  // Generated Content
  generatedContent: {
    systemPrompt: string
    firstMessage: string
  }
  
  // Structured Data Collection
  structuredData: {
    questions: Array<{
      questionText: string
      answerDescription: string
      fieldName: string
      fieldType: 'string' | 'number' | 'boolean'
      isRequired: boolean
      order: number
    }>
    functions: any[] // Vapi function definitions
  }
  
  // Webhook Configuration
  webhookConfig: {
    url: string
    secret: string
  }
  
  // Metadata
  metadata: {
    userId: string
    teamId: string
    createdAt: string
    environment: string
  }
}

export class MakeClient {
  private webhookUrl: string
  private apiKey?: string
  
  constructor(webhookUrl: string, apiKey?: string) {
    this.webhookUrl = webhookUrl
    this.apiKey = apiKey
  }
  
  /**
   * Send assistant data to Make.com webhook
   */
  async createAssistant(payload: MakeAssistantPayload): Promise<MakeWebhookResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add API key if configured
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey
      }
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'create_assistant',
          timestamp: new Date().toISOString(),
          payload,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Make.com webhook error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Validate response
      const validatedResponse = makeWebhookResponseSchema.parse(data)
      
      if (!validatedResponse.success) {
        throw new Error(validatedResponse.data?.error || 'Make.com processing failed')
      }
      
      return validatedResponse
    } catch (error) {
      console.error('Make.com webhook error:', error)
      
      // Re-throw with context
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid Make.com response: ${error.message}`)
      }
      
      throw error
    }
  }
  
  /**
   * Update assistant in Make.com
   */
  async updateAssistant(
    assistantId: string, 
    vapiAssistantId: string,
    updates: Partial<MakeAssistantPayload>
  ): Promise<MakeWebhookResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }
    
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'update_assistant',
        assistantId,
        vapiAssistantId,
        timestamp: new Date().toISOString(),
        updates,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Make.com webhook error: ${response.status}`)
    }
    
    const data = await response.json()
    return makeWebhookResponseSchema.parse(data)
  }
  
  /**
   * Delete assistant via Make.com
   */
  async deleteAssistant(
    assistantId: string,
    vapiAssistantId?: string
  ): Promise<MakeWebhookResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }
    
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'delete_assistant',
        assistantId,
        vapiAssistantId,
        timestamp: new Date().toISOString(),
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Make.com webhook error: ${response.status}`)
    }
    
    const data = await response.json()
    return makeWebhookResponseSchema.parse(data)
  }
}

// Create singleton instance
export const makeClient = new MakeClient(
  process.env.MAKE_WEBHOOK_URL || '',
  process.env.MAKE_WEBHOOK_API_KEY
)