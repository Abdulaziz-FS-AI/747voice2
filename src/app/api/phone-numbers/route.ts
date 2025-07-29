import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { PhoneNumberValidator } from '@/lib/phone-number-validator'
import { EncryptionService } from '@/lib/encryption'
import type { Database } from '@/types/database'

// Validation schemas
const createPhoneNumberSchema = z.object({
  friendly_name: z.string().min(1).max(255),
  phone_number: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  provider: z.enum(['testing', 'twilio', 'vapi']),
  assigned_assistant_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  provider_config: z.object({
    account_sid: z.string().optional(),
    auth_token: z.string().optional(),
    webhook_url: z.string().url().optional(),
  }).optional().default({})
})

const updatePhoneNumberSchema = z.object({
  friendly_name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
  assigned_assistant_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
})

type CreatePhoneNumberData = z.infer<typeof createPhoneNumberSchema>
type UpdatePhoneNumberData = z.infer<typeof updatePhoneNumberSchema>

/**
 * GET /api/phone-numbers
 * Retrieve all phone numbers for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    const { data: phoneNumbers, error } = await supabase
      .from('phone_numbers')
      .select(`
        *,
        assistants:assigned_assistant_id (
          id,
          name,
          agent_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform the data to flatten assistant info
    const transformedData = phoneNumbers?.map(number => ({
      ...number,
      assistants: number.assistants ? {
        id: number.assistants.id,
        name: number.assistants.name
      } : null
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedData
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * POST /api/phone-numbers
 * Create a new phone number
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest()
    const body = await request.json()

    // Validate permissions
    const hasPermission = await requirePermission(user.id, 'manage_phone_numbers')
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to manage phone numbers' }
      }, { status: 403 })
    }

    // Validate input
    const validatedData = createPhoneNumberSchema.parse(body)
    const supabase = createServiceRoleClient()
    const validator = new PhoneNumberValidator()
    const encryption = new EncryptionService()

    // Check if phone number already exists for this user
    const { data: existingNumber } = await supabase
      .from('phone_numbers')
      .select('id')
      .eq('user_id', user.id)
      .eq('phone_number', validatedData.phone_number)
      .eq('is_active', true)
      .single()

    if (existingNumber) {
      return NextResponse.json({
        success: false,
        error: { code: 'PHONE_NUMBER_EXISTS', message: 'This phone number is already added to your account' }
      }, { status: 409 })
    }

    // Validate phone number format
    if (!validator.isValidE164(validatedData.phone_number)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PHONE_FORMAT', message: 'Phone number must be in E.164 format' }
      }, { status: 400 })
    }

    // Provider-specific validation and setup
    let providerConfig = {}
    let isVerified = false
    let verificationStatus = 'pending'
    let verificationError = null

    if (validatedData.provider === 'testing') {
      // Testing mode - no external validation needed
      isVerified = true
      verificationStatus = 'verified'
      providerConfig = {
        mode: 'testing',
        description: 'Testing mode - no external provider needed'
      }
    } else if (validatedData.provider === 'twilio') {
      // Validate Twilio credentials
      const { account_sid, auth_token, webhook_url } = validatedData.provider_config
      
      if (!account_sid || !auth_token) {
        return NextResponse.json({
          success: false,
          error: { code: 'MISSING_TWILIO_CREDENTIALS', message: 'Twilio Account SID and Auth Token are required' }
        }, { status: 400 })
      }

      // Validate Twilio credentials format
      if (!validator.isValidTwilioSid(account_sid)) {
        return NextResponse.json({
          success: false,
          error: { code: 'INVALID_TWILIO_SID', message: 'Invalid Twilio Account SID format' }
        }, { status: 400 })
      }

      try {
        // Verify Twilio credentials and phone number ownership
        const twilioValidation = await validator.validateTwilioCredentials(
          account_sid,
          auth_token,
          validatedData.phone_number
        )

        if (!twilioValidation.isValid) {
          return NextResponse.json({
            success: false,
            error: { 
              code: 'TWILIO_VALIDATION_FAILED', 
              message: twilioValidation.error || 'Failed to validate Twilio credentials' 
            }
          }, { status: 400 })
        }

        isVerified = true
        verificationStatus = 'verified'
        
        // Encrypt sensitive data before storing
        providerConfig = {
          account_sid,
          auth_token_encrypted: await encryption.encrypt(auth_token),
          webhook_url: webhook_url || `${process.env.NEXT_PUBLIC_URL}/api/webhooks/twilio`,
          phone_number_sid: twilioValidation.phoneNumberSid,
          capabilities: twilioValidation.capabilities
        }
      } catch (error) {
        console.error('Twilio validation error:', error)
        verificationStatus = 'failed'
        verificationError = error instanceof Error ? error.message : 'Twilio validation failed'
        
        // Store anyway but mark as unverified
        providerConfig = {
          account_sid,
          auth_token_encrypted: await encryption.encrypt(auth_token),
          webhook_url: webhook_url || `${process.env.NEXT_PUBLIC_URL}/api/webhooks/twilio`,
          error: verificationError
        }
      }
    }

    // Validate assistant assignment if provided
    if (validatedData.assigned_assistant_id) {
      const { data: assistant } = await supabase
        .from('assistants')
        .select('id')
        .eq('id', validatedData.assigned_assistant_id)
        .eq('user_id', user.id)
        .single()

      if (!assistant) {
        return NextResponse.json({
          success: false,
          error: { code: 'ASSISTANT_NOT_FOUND', message: 'Assistant not found or not owned by user' }
        }, { status: 404 })
      }
    }

    // Create phone number record
    const phoneNumberData = {
      user_id: user.id,
      // team_id removed for single-user architecture
      friendly_name: validatedData.friendly_name,
      phone_number: validatedData.phone_number,
      provider: validatedData.provider,
      provider_config: providerConfig,
      is_active: true,
      is_verified: isVerified,
      verification_status: verificationStatus,
      verification_error: verificationError,
      assigned_assistant_id: validatedData.assigned_assistant_id,
      assigned_at: validatedData.assigned_assistant_id ? new Date().toISOString() : null,
      notes: validatedData.notes,
      webhook_url: validatedData.provider === 'twilio' ? 
        (validatedData.provider_config.webhook_url || `${process.env.NEXT_PUBLIC_URL}/api/webhooks/twilio`) : 
        null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: phoneNumber, error } = await supabase
      .from('phone_numbers')
      .insert(phoneNumberData)
      .select(`
        *,
        assistants:assigned_assistant_id (
          id,
          name,
          agent_name
        )
      `)
      .single()

    if (error) {
      throw error
    }

    // If Twilio and verified, set up webhook
    if (validatedData.provider === 'twilio' && isVerified) {
      try {
        await validator.setupTwilioWebhook(
          (providerConfig as any).account_sid,
          await encryption.decrypt((providerConfig as any).auth_token_encrypted),
          validatedData.phone_number,
          (providerConfig as any).webhook_url
        )
      } catch (error) {
        console.error('Failed to setup Twilio webhook:', error)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...phoneNumber,
        assistants: phoneNumber.assistants ? {
          id: phoneNumber.assistants.id,
          name: phoneNumber.assistants.name
        } : null
      },
      message: 'Phone number added successfully'
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: (error as any).errors
        }
      }, { status: 400 })
    }
    
    return handleAPIError(error)
  }
}