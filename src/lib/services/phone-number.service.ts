/**
 * Phone Number Service
 * Senior Developer Implementation
 * 
 * Handles all phone number operations with proper error handling,
 * validation, and transaction management.
 */

import { createServiceRoleClient } from '@/lib/supabase'
import { VAPIService } from './vapi.service'
import { LoggerService } from './logger.service'
import { ValidationError, NotFoundError, ConflictError } from '@/lib/errors'
import { z } from 'zod'

// Validation schemas
const PhoneNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  friendlyName: z.string().min(1).max(100, 'Friendly name must be 1-100 characters'),
  twilioAccountSid: z.string().min(1, 'Twilio Account SID is required'),
  twilioAuthToken: z.string().min(1, 'Twilio Auth Token is required'),
  assistantId: z.string().uuid().nullable().optional()
})

const AssignmentSchema = z.object({
  assistantId: z.string().uuid().nullable(),
})

export interface PhoneNumberData {
  id: string
  userId: string
  phoneNumber: string
  friendlyName: string
  vapiPhoneId: string
  vapiCredentialId: string
  assignedAssistantId: string | null
  webhookUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  assignedAssistant?: {
    id: string
    name: string
    vapiAssistantId: string
  }
}

export interface CreatePhoneNumberRequest {
  phoneNumber: string
  friendlyName: string
  twilioAccountSid: string
  twilioAuthToken: string
  assistantId?: string | null
}

export interface AssignAssistantRequest {
  assistantId: string | null
}

export class PhoneNumberService {
  private readonly logger = LoggerService.getInstance()
  private readonly vapiService: VAPIService
  
  constructor() {
    try {
      this.vapiService = VAPIService.getInstance()
    } catch (error) {
      this.logger.error('Failed to initialize VAPI service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error(`VAPI service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a new phone number for a user
   */
  async createPhoneNumber(
    userId: string,
    request: CreatePhoneNumberRequest
  ): Promise<PhoneNumberData> {
    const startTime = Date.now()
    const correlationId = crypto.randomUUID()
    
    this.logger.info('Creating phone number', {
      correlationId,
      userId,
      phoneNumber: request.phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask for security
      friendlyName: request.friendlyName
    })

    try {
      // Validate input
      const validatedData = PhoneNumberSchema.parse(request)
      
      const supabase = createServiceRoleClient()

      // Check if phone number already exists for user
      const { data: existingPhone } = await supabase
        .from('user_phone_numbers')
        .select('id')
        .eq('user_id', userId)
        .eq('phone_number', validatedData.phoneNumber)
        .single()

      if (existingPhone) {
        throw new ConflictError('Phone number already exists for this user')
      }

      // Create phone number in VAPI first
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/phone/${userId}`
      
      // Get assistant's VAPI ID if assigned
      let vapiAssistantId: string | null = null
      if (request.assistantId) {
        const { data: assistant } = await supabase
          .from('user_assistants')
          .select('vapi_assistant_id')
          .eq('id', request.assistantId)
          .eq('user_id', userId)
          .single()
        
        if (assistant) {
          vapiAssistantId = assistant.vapi_assistant_id
        }
      }
      
      // Common server configuration for Make.com webhook
      const serverConfig = {
        url: process.env.MAKE_WEBHOOK_URL!,
        timeoutSeconds: 20,
        headers: {
          'Authorization': `Bearer ${process.env.MAKE_WEBHOOK_SECRET}`
        }
      }
      
      // Create Twilio phone number with user-provided credentials
      const vapiPayload: any = {
        provider: 'twilio' as const,
        number: validatedData.phoneNumber,
        twilioAccountSid: validatedData.twilioAccountSid,
        twilioAuthToken: validatedData.twilioAuthToken,
        name: validatedData.friendlyName,
        assistantId: vapiAssistantId,
        // Remove server config for now as it's optional
        // server: serverConfig
      }
      
      this.logger.info('Creating Twilio phone number with user credentials', {
        correlationId,
        provider: 'twilio',
        accountSid: validatedData.twilioAccountSid.slice(0, 8) + '...', // Mask for security
        phoneNumber: validatedData.phoneNumber.replace(/\d(?=\d{4})/g, '*')
      })
      
      const vapiPhone = await this.vapiService.createPhoneNumber(vapiPayload)
      
      this.logger.info('VAPI phone number created, preparing database insert', {
        correlationId,
        vapiPhoneId: vapiPhone.id,
        credentialId: vapiPhone.credentialId,
        hasCredentialId: !!vapiPhone.credentialId
      })

      // Begin database transaction
      const { data: dbPhone, error: dbError } = await supabase
        .from('user_phone_numbers')
        .insert({
          user_id: userId,
          phone_number: validatedData.phoneNumber,
          friendly_name: validatedData.friendlyName,  
          provider: 'twilio',
          vapi_phone_id: vapiPhone.id,
          vapi_credential_id: vapiPhone.credentialId || 'auto_generated',
          twilio_account_sid: validatedData.twilioAccountSid,
          twilio_auth_token: validatedData.twilioAuthToken, // Store encrypted in production
          webhook_url: webhookUrl,
          assigned_assistant_id: request.assistantId || null,
          is_active: true
        })
        .select('*')
        .single()

      if (dbError) {
        // Rollback: Delete from VAPI if database insert fails
        try {
          await this.vapiService.deletePhoneNumber(vapiPhone.id)
        } catch (rollbackError) {
          this.logger.error('Failed to rollback VAPI phone number creation', {
            correlationId,
            vapiPhoneId: vapiPhone.id,
            error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          })
        }
        throw dbError
      }

      const duration = Date.now() - startTime
      this.logger.info('Phone number created successfully', {
        correlationId,
        phoneId: dbPhone.id,
        vapiPhoneId: vapiPhone.id,
        duration
      })

      return this.mapToPhoneNumberData(dbPhone)

    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error('Failed to create phone number', {
        correlationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
      throw error
    }
  }

  /**
   * Get all phone numbers for a user
   */
  async getUserPhoneNumbers(userId: string): Promise<PhoneNumberData[]> {
    const correlationId = crypto.randomUUID()
    
    try {
      const supabase = createServiceRoleClient()
      
      const { data: phones, error } = await supabase
        .from('user_phone_numbers')
        .select(`
          *,
          assigned_assistant:user_assistants(
            id,
            name,
            vapi_assistant_id
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return phones?.map(phone => this.mapToPhoneNumberData(phone)) || []

    } catch (error) {
      this.logger.error('Failed to fetch user phone numbers', {
        correlationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get a specific phone number by ID
   */
  async getPhoneNumberById(phoneId: string, userId: string): Promise<PhoneNumberData> {
    const correlationId = crypto.randomUUID()
    
    try {
      const supabase = createServiceRoleClient()
      
      const { data: phone, error } = await supabase
        .from('user_phone_numbers')
        .select(`
          *,
          assigned_assistant:user_assistants(
            id,
            name,
            vapi_assistant_id
          )
        `)
        .eq('id', phoneId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (error || !phone) {
        throw new NotFoundError('Phone number not found')
      }

      return this.mapToPhoneNumberData(phone)

    } catch (error) {
      this.logger.error('Failed to fetch phone number', {
        correlationId,
        phoneId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Assign or unassign an assistant to a phone number
   */
  async assignAssistant(
    phoneId: string,
    userId: string,
    request: AssignAssistantRequest
  ): Promise<PhoneNumberData> {
    const correlationId = crypto.randomUUID()
    const startTime = Date.now()
    
    this.logger.info('Assigning assistant to phone number', {
      correlationId,
      phoneId,
      userId,
      assistantId: request.assistantId ?? undefined
    })

    try {
      // Validate input
      const validatedData = AssignmentSchema.parse(request)
      
      const supabase = createServiceRoleClient()

      // Get phone number (verify ownership)
      const phone = await this.getPhoneNumberById(phoneId, userId)
      
      let vapiAssistantId: string | null = null
      
      // Validate assistant ownership if assigning
      if (validatedData.assistantId) {
        const { data: assistant, error: assistantError } = await supabase
          .from('user_assistants')
          .select('id, name, vapi_assistant_id')
          .eq('id', validatedData.assistantId)
          .eq('user_id', userId)
          .single()

        if (assistantError || !assistant) {
          throw new NotFoundError('Assistant not found or not owned by user')
        }

        vapiAssistantId = assistant.vapi_assistant_id
      }

      // Update VAPI phone number assignment
      await this.vapiService.updatePhoneNumber(phone.vapiPhoneId, {
        assistantId: vapiAssistantId
      })

      // Update database
      const { data: updatedPhone, error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({ 
          assigned_assistant_id: validatedData.assistantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', phoneId)
        .eq('user_id', userId)
        .select(`
          *,
          assigned_assistant:user_assistants(
            id,
            name,
            vapi_assistant_id
          )
        `)
        .single()

      if (updateError) throw updateError

      const duration = Date.now() - startTime
      this.logger.info('Assistant assignment completed', {
        correlationId,
        phoneId,
        assistantId: validatedData.assistantId ?? undefined,
        duration
      })

      return this.mapToPhoneNumberData(updatedPhone)

    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error('Failed to assign assistant', {
        correlationId,
        phoneId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
      throw error
    }
  }

  /**
   * Delete a phone number
   */
  async deletePhoneNumber(phoneId: string, userId: string): Promise<void> {
    const correlationId = crypto.randomUUID()
    const startTime = Date.now()
    
    this.logger.info('Deleting phone number', {
      correlationId,
      phoneId,
      userId
    })

    try {
      const supabase = createServiceRoleClient()

      // Get phone number (verify ownership)
      const phone = await this.getPhoneNumberById(phoneId, userId)

      // Check if phone number is assigned to any assistant
      if (phone.assignedAssistantId) {
        throw new ConflictError(`Phone number is assigned to assistant "${phone.assignedAssistant?.name}". Please unassign first.`)
      }

      // Delete from VAPI first
      await this.vapiService.deletePhoneNumber(phone.vapiPhoneId)

      // Soft delete from database (maintain audit trail)
      const { error: deleteError } = await supabase
        .from('user_phone_numbers')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', phoneId)
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      const duration = Date.now() - startTime
      this.logger.info('Phone number deleted successfully', {
        correlationId,
        phoneId,
        vapiPhoneId: phone.vapiPhoneId,
        duration
      })

    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error('Failed to delete phone number', {
        correlationId,
        phoneId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      })
      throw error
    }
  }

  /**
   * Map database row to PhoneNumberData
   */
  private mapToPhoneNumberData(row: any): PhoneNumberData {
    return {
      id: row.id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      friendlyName: row.friendly_name,
      vapiPhoneId: row.vapi_phone_id,
      vapiCredentialId: row.vapi_credential_id,
      assignedAssistantId: row.assigned_assistant_id,
      webhookUrl: row.webhook_url,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignedAssistant: row.assigned_assistant ? {
        id: row.assigned_assistant.id,
        name: row.assigned_assistant.name,
        vapiAssistantId: row.assigned_assistant.vapi_assistant_id
      } : undefined
    }
  }
}