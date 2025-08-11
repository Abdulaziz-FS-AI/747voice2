import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { SimplePhoneService } from '@/lib/services/simple-phone.service'
import type { Database } from '@/types/database'

// Validation schemas - Twilio only
const createPhoneNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  friendlyName: z.string().min(1).max(255),
  twilioAccountSid: z.string().regex(/^AC[a-fA-f0-9]{32}$/, 'Invalid Twilio Account SID format'),
  twilioAuthToken: z.string().min(32, 'Twilio Auth Token is required'),
  assistantId: z.string().uuid('Assistant assignment is required')
})

const updatePhoneNumberSchema = z.object({
  friendly_name: z.string().min(1).max(255).optional(),
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
      .from('user_phone_numbers')
      .select(`
        *,
        user_assistants!assigned_assistant_id (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform the data to flatten assistant info
    const transformedData = phoneNumbers?.map(number => ({
      ...number,
      assistant: number.user_assistants ? {
        id: number.user_assistants.id,
        name: number.user_assistants.name
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

    console.log('🔥 [API ROUTE] Raw request body received:', {
      userId: user.id,
      step,
      body: {
        ...body,
        twilioAuthToken: body.twilioAuthToken ? '[REDACTED]' : undefined
      },
      assistantId: body.assistantId,
      assistantIdType: typeof body.assistantId,
      assistantIdLength: body.assistantId?.length,
      isAssistantIdEmpty: body.assistantId === '',
      isAssistantIdUndefined: body.assistantId === undefined,
      isAssistantIdNull: body.assistantId === null
    })

    // User is already authenticated, skip permission check for now
    step = 'skipping permission validation'

    // Validate input
    step = 'validating input schema'
    console.log('🔥 [API ROUTE] Starting Zod validation...')
    console.log('🔥 [API ROUTE] Schema expects assistantId as:', createPhoneNumberSchema.shape.assistantId._def)
    
    try {
      const validatedData = createPhoneNumberSchema.parse(body)
      console.log('🔥 [API ROUTE] ✅ Zod validation passed!')
      console.log('🔥 [API ROUTE] Validated assistantId:', {
        value: validatedData.assistantId,
        type: typeof validatedData.assistantId,
        length: validatedData.assistantId?.length
      })
    } catch (zodError) {
      console.error('🔥 [API ROUTE] ❌ Zod validation failed!')
      console.error('🔥 [API ROUTE] Zod error details:', {
        error: zodError,
        issues: zodError instanceof z.ZodError ? zodError.issues : 'Not a ZodError'
      })
      throw zodError
    }
    
    const validatedData = createPhoneNumberSchema.parse(body)
    
    // Use the simplified PhoneNumberService
    step = 'creating phone number service'
    console.log('Creating simplified phone number service...')
    const phoneNumberService = new SimplePhoneService()
    
    step = 'calling phone number service'
    console.log('🔥 [API ROUTE] Calling simplePhoneService.createPhoneNumber...')
    console.log('🔥 [API ROUTE] Service call parameters:', {
      userId: user.id,
      phoneNumber: validatedData.phoneNumber,
      assistantId: validatedData.assistantId
    })
    
    const result = await phoneNumberService.createPhoneNumber(
      user.id,
      validatedData.phoneNumber,
      validatedData.friendlyName,
      validatedData.twilioAccountSid,
      validatedData.twilioAuthToken,
      validatedData.assistantId
    )
    console.log('🔥 [API ROUTE] ✅ Phone number created successfully:', result.id)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Phone number created successfully'
    })
  } catch (error) {
    console.error(`🔥 [API ROUTE] ❌ Phone number creation error at step "${step}":`, error)
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error('🔥 [API ROUTE] Error name:', error.name)
      console.error('🔥 [API ROUTE] Error message:', error.message)
      console.error('🔥 [API ROUTE] Error stack:', error.stack)
    }
    
    // If it's a known error type, log additional details
    if (error && typeof error === 'object') {
      console.error('🔥 [API ROUTE] Error details:', JSON.stringify(error, null, 2))
    }
    
    // Check if it's a Supabase/PostgreSQL error
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('🔥 [API ROUTE] Database error code:', (error as any).code)
      console.error('🔥 [API ROUTE] Database error message:', (error as any).message)
      console.error('🔥 [API ROUTE] Database error details:', (error as any).details)
    }
    
    return handleAPIError(error)
  }
}
