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
      .from('user_phone_numbers')
      .select(`
        *,
        assistants:assigned_assistant_id (
          id,
          name,
          agent_name,
          vapi_assistant_id
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
 * Create a new phone number using Twilio credentials
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
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
    
    // Use the PhoneNumberService instead of direct implementation
    const phoneNumberService = new PhoneNumberService()
    const result = await phoneNumberService.createPhoneNumber(user.id, validatedData)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: 'Phone number created successfully'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}
