import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { PhoneNumberService } from '@/lib/services/phone-number.service'
import type { Database } from '@/types/database'

// Validation schemas - Twilio only
const createPhoneNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  friendlyName: z.string().min(1).max(255),
  twilioAccountSid: z.string().regex(/^AC[a-fA-f0-9]{32}$/, 'Invalid Twilio Account SID format'),
  twilioAuthToken: z.string().min(32, 'Twilio Auth Token is required'),
  assistantId: z.string().uuid().optional().nullable()
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
        assistants!assigned_assistant_id (
          id,
          name
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
      assistant: number.assistants ? {
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
 * Create a new phone number using Twilio credentials
 */
export async function POST(request: NextRequest) {
  let step = 'initialization'
  
  try {
    // Check for required environment variables
    step = 'checking environment variables'
    if (!process.env.VAPI_API_KEY) {
      console.error('Missing VAPI_API_KEY environment variable')
      return NextResponse.json({
        success: false,
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: 'VAPI API key is not configured' 
        }
      }, { status: 500 })
    }

    step = 'authenticating request'
    const { user } = await authenticateRequest()
    
    step = 'parsing request body'
    const body = await request.json()

    console.log('Phone number creation request:', {
      userId: user.id,
      step,
      requestBody: {
        ...body,
        twilioAuthToken: body.twilioAuthToken ? '[REDACTED]' : undefined
      }
    })

    // Validate permissions
    step = 'validating permissions'
    const hasPermission = await requirePermission(user.id, 'manage_phone_numbers')
    if (!hasPermission) {
      console.error('Permission denied for user:', user.id)
      return NextResponse.json({
        success: false,
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'You do not have permission to manage phone numbers' }
      }, { status: 403 })
    }

    // Validate input
    step = 'validating input schema'
    console.log('Validating input data...')
    const validatedData = createPhoneNumberSchema.parse(body)
    console.log('Input validation passed')
    
    // Use the PhoneNumberService instead of direct implementation
    step = 'creating phone number service'
    console.log('Creating phone number service...')
    const phoneNumberService = new PhoneNumberService()
    
    step = 'calling phone number service'
    console.log('Calling phoneNumberService.createPhoneNumber...')
    const result = await phoneNumberService.createPhoneNumber(user.id, validatedData)
    console.log('Phone number created successfully:', result.id)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Phone number created successfully'
    })
  } catch (error) {
    console.error(`Phone number creation error at step "${step}":`, error)
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    // If it's a known error type, log additional details
    if (error && typeof error === 'object') {
      console.error('Error details:', JSON.stringify(error, null, 2))
    }
    
    return handleAPIError(error)
  }
}
