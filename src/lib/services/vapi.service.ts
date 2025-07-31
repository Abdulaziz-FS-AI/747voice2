/**
 * VAPI Service
 * Senior Developer Implementation
 * 
 * Centralized service for all VAPI API interactions with proper
 * error handling, retry logic, and rate limiting.
 */

import { LoggerService } from './logger.service'
import { VAPIError, RateLimitError, ServiceUnavailableError } from '@/lib/errors'

interface VAPIPhoneNumberPayload {
  provider: 'twilio' | 'byo-phone-number'
  number: string
  twilioAccountSid?: string
  twilioAuthToken?: string
  credentialId?: string
  name?: string
  assistantId?: string | null
  workflowId?: string | null
  squadId?: string | null
  server?: {
    url: string
    timeoutSeconds?: number
    headers?: Record<string, string>
    backoffPlan?: {
      type: 'fixed' | 'exponential'
      maxRetries?: number
      baseDelaySeconds?: number
    }
  }
  fallbackDestination?: {
    type: 'number'
    message?: string
    number: string
    extension?: string
    callerId?: string
    description?: string
  }
  hooks?: Array<{
    on: 'call.ringing' | 'call.answered' | 'call.ended'
    do: Array<{
      type: 'transfer'
      destination: {
        type: 'number'
        message?: string
        number: string
        extension?: string
        callerId?: string
        description?: string
      }
    }>
  }>
}


interface VAPIPhoneNumberResponse {
  id: string
  orgId: string
  createdAt: string
  updatedAt: string
  provider: string
  number: string
  credentialId: string
  name?: string
  assistantId?: string | null
  workflowId?: string | null
  squadId?: string | null
  status: 'active' | 'inactive'
  numberE164CheckEnabled?: boolean
  server?: any
  fallbackDestination?: any
  hooks?: any[]
}

interface VAPIAssistantPayload {
  name: string
  model: any
  voice: any
  firstMessage: string
  firstMessageMode: string
  maxDurationSeconds: number
  backgroundSound: string
  metadata: Record<string, string>
  analysisPlan?: any
  serverMessages?: string[]
  clientMessages?: string[] // Add client messages from our form
  server?: {
    url: string
    timeoutSeconds?: number
    headers?: Record<string, string>
  }
}

interface VAPIAssistantResponse {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  [key: string]: any
}

export class VAPIService {
  private static instance: VAPIService
  private readonly logger = LoggerService.getInstance()
  private readonly baseUrl = 'https://api.vapi.ai'
  private readonly apiKey = process.env.VAPI_API_KEY!
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second base delay

  private constructor() {
    if (!this.apiKey) {
      throw new Error('VAPI_API_KEY environment variable is required')
    }
  }

  static getInstance(): VAPIService {
    if (!VAPIService.instance) {
      VAPIService.instance = new VAPIService()
    }
    return VAPIService.instance
  }

  /**
   * Create a phone number in VAPI
   */
  async createPhoneNumber(payload: VAPIPhoneNumberPayload): Promise<VAPIPhoneNumberResponse> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Creating VAPI phone number', {
      correlationId,
      number: payload.number.replace(/\d(?=\d{4})/g, '*'), // Mask for security
      name: payload.name
    })

    try {
      const response = await this.makeRequest<VAPIPhoneNumberResponse>({
        method: 'POST',
        endpoint: '/phone-number',
        body: payload,
        correlationId
      })

      this.logger.info('VAPI phone number created successfully', {
        correlationId,
        vapiPhoneId: response.id
      })

      return response

    } catch (error) {
      this.logger.error('Failed to create VAPI phone number', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Update a phone number in VAPI
   */
  async updatePhoneNumber(
    phoneId: string, 
    updates: Partial<VAPIPhoneNumberPayload>
  ): Promise<VAPIPhoneNumberResponse> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Updating VAPI phone number', {
      correlationId,
      vapiPhoneId: phoneId,
      updates: Object.keys(updates)
    })

    try {
      const response = await this.makeRequest<VAPIPhoneNumberResponse>({
        method: 'PATCH',
        endpoint: `/phone-number/${phoneId}`,
        body: updates,
        correlationId
      })

      this.logger.info('VAPI phone number updated successfully', {
        correlationId,
        vapiPhoneId: phoneId
      })

      return response

    } catch (error) {
      this.logger.error('Failed to update VAPI phone number', {
        correlationId,
        vapiPhoneId: phoneId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Delete a phone number from VAPI
   */
  async deletePhoneNumber(phoneId: string): Promise<void> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Deleting VAPI phone number', {
      correlationId,
      vapiPhoneId: phoneId
    })

    try {
      await this.makeRequest({
        method: 'DELETE',
        endpoint: `/phone-number/${phoneId}`,
        correlationId
      })

      this.logger.info('VAPI phone number deleted successfully', {
        correlationId,
        vapiPhoneId: phoneId
      })

    } catch (error) {
      this.logger.error('Failed to delete VAPI phone number', {
        correlationId,
        vapiPhoneId: phoneId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Create an assistant in VAPI
   */
  async createAssistant(payload: VAPIAssistantPayload): Promise<VAPIAssistantResponse> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Creating VAPI assistant', {
      correlationId,
      name: payload.name
    })

    try {
      // Use client-selected message types, fallback to system default if none selected
      const clientMessageTypes = payload.clientMessages && payload.clientMessages.length > 0 
        ? payload.clientMessages 
        : ['end-of-call-report'] // Default system message (includes transcript)

      // Server messages are always end-of-call-report for webhook
      const serverMessageTypes = ['end-of-call-report']

      // Add Make.com webhook configuration using the correct VAPI API structure
      const enhancedPayload = {
        ...payload,
        serverUrl: process.env.MAKE_WEBHOOK_URL!,
        serverMessages: serverMessageTypes,
        clientMessages: clientMessageTypes, // Keep client messages in payload for VAPI
        server: {
          url: process.env.MAKE_WEBHOOK_URL!,
          timeoutSeconds: 20,
          headers: {
            'x-make-apikey': process.env.MAKE_WEBHOOK_SECRET!,
            'Content-Type': 'application/json'
          }
        }
      }

      // Remove any old serverUrlSecret if it exists (keeping serverUrl and server.url for compatibility)
      delete (enhancedPayload as any).serverUrlSecret

      this.logger.info('Adding Make.com webhook configuration', {
        correlationId,
        webhookUrl: process.env.MAKE_WEBHOOK_URL?.substring(0, 30) + '...', // Mask for security
        serverMessages: enhancedPayload.serverMessages,
        selectedByUser: payload.clientMessages && payload.clientMessages.length > 0
      })

      const response = await this.makeRequest<VAPIAssistantResponse>({
        method: 'POST',
        endpoint: '/assistant',
        body: enhancedPayload,
        correlationId
      })

      this.logger.info('VAPI assistant created successfully', {
        correlationId,
        vapiAssistantId: response.id,
        name: response.name
      })

      return response

    } catch (error) {
      this.logger.error('Failed to create VAPI assistant', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get all assistants for the organization
   */
  async getAssistants(): Promise<VAPIAssistantResponse[]> {
    const correlationId = crypto.randomUUID()
    
    try {
      const response = await this.makeRequest<VAPIAssistantResponse[]>({
        method: 'GET',
        endpoint: '/assistant',
        correlationId
      })

      this.logger.info('VAPI assistants fetched successfully', {
        correlationId,
        count: response.length
      })

      return response

    } catch (error) {
      this.logger.error('Failed to fetch VAPI assistants', {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Update an assistant in VAPI
   */
  async updateAssistant(
    assistantId: string, 
    updates: Partial<VAPIAssistantPayload>
  ): Promise<VAPIAssistantResponse> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Updating VAPI assistant', {
      correlationId,
      vapiAssistantId: assistantId,
      updates: Object.keys(updates)
    })

    try {
      const response = await this.makeRequest<VAPIAssistantResponse>({
        method: 'PUT',
        endpoint: `/assistant/${assistantId}`,
        body: updates,
        correlationId
      })

      this.logger.info('VAPI assistant updated successfully', {
        correlationId,
        vapiAssistantId: assistantId
      })

      return response

    } catch (error) {
      this.logger.error('Failed to update VAPI assistant', {
        correlationId,
        vapiAssistantId: assistantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Delete an assistant from VAPI
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Deleting VAPI assistant', {
      correlationId,
      vapiAssistantId: assistantId
    })

    try {
      await this.makeRequest({
        method: 'DELETE',
        endpoint: `/assistant/${assistantId}`,
        correlationId
      })

      this.logger.info('VAPI assistant deleted successfully', {
        correlationId,
        vapiAssistantId: assistantId
      })

    } catch (error) {
      this.logger.error('Failed to delete VAPI assistant', {
        correlationId,
        vapiAssistantId: assistantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Make HTTP request to VAPI with retry logic and error handling
   */
  private async makeRequest<T = any>({
    method,
    endpoint,
    body,
    correlationId
  }: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    endpoint: string
    body?: any
    correlationId: string
  }): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    let lastError: Error = new Error('Unknown error')

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const requestInit: RequestInit = {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            'User-Agent': 'VoiceMatrix/1.0'
          }
        }

        if (body && method !== 'GET') {
          requestInit.body = JSON.stringify(body)
        }

        const startTime = Date.now()
        const response = await fetch(url, requestInit)
        const duration = Date.now() - startTime

        // Log request details
        this.logger.info('VAPI request completed', {
          correlationId,
          method,
          endpoint,
          status: response.status,
          duration,
          attempt
        })

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay * attempt
          
          this.logger.warn('VAPI rate limit hit, retrying', {
            correlationId,
            attempt,
            retryAfter: delay
          })

          if (attempt < this.maxRetries) {
            await this.sleep(delay)
            continue
          } else {
            throw new RateLimitError('VAPI rate limit exceeded')
          }
        }

        // Handle server errors with retry
        if (response.status >= 500) {
          const errorText = await response.text()
          lastError = new ServiceUnavailableError(`VAPI server error: ${errorText}`)
          
          this.logger.warn('VAPI server error, retrying', {
            correlationId,
            status: response.status,
            attempt,
            error: errorText
          })

          if (attempt < this.maxRetries) {
            await this.sleep(this.retryDelay * attempt)
            continue
          } else {
            throw lastError
          }
        }

        // Handle client errors (no retry)
        if (!response.ok) {
          const errorText = await response.text()
          let errorData: any

          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { message: errorText }
          }

          throw new VAPIError(
            errorData.message || `VAPI API error: ${response.status}`,
            response.status,
            errorData
          )
        }

        // Parse successful response
        if (method === 'DELETE') {
          return undefined as T
        }

        const responseText = await response.text()
        return responseText ? JSON.parse(responseText) : {} as T

      } catch (error) {
        lastError = error as Error

        // Don't retry client errors or network errors on last attempt
        if (attempt === this.maxRetries || 
            error instanceof VAPIError || 
            error instanceof TypeError) {
          break
        }

        this.logger.warn('VAPI request failed, retrying', {
          correlationId,
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        await this.sleep(this.retryDelay * attempt)
      }
    }

    throw lastError
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}