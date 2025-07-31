import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'

const updatePhoneNumberSchema = z.object({
  friendly_name: z.string().min(1).max(255).optional(),
  is_active: z.boolean().optional(),
  assigned_assistant_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
})

/**
 * GET /api/phone-numbers/[id]
 * Get a specific phone number
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    const { data: phoneNumber, error } = await supabase
      .from('user_phone_numbers')
      .select(`
        *,
        user_assistants!assigned_assistant_id (
          id,
          name
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !phoneNumber) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...phoneNumber,
        user_assistants: phoneNumber.user_assistants ? {
          id: phoneNumber.user_assistants.id,
          name: phoneNumber.user_assistants.name
        } : null
      }
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * PATCH /api/phone-numbers/[id]
 * Update a phone number
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { user } = await authenticateRequest()
    const body = await request.json()

    // User is already authenticated, no additional permission check needed for now

    // Validate input
    const validatedData = updatePhoneNumberSchema.parse(body)
    const supabase = createServiceRoleClient()

    // Verify ownership
    const { data: existingNumber } = await supabase
      .from('user_phone_numbers')
      .select('id, user_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existingNumber) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' }
      }, { status: 404 })
    }

    // Validate assistant assignment if provided
    if (validatedData.assigned_assistant_id) {
      const { data: assistant } = await supabase
        .from('user_assistants')
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

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Handle assignment changes
    if ('assigned_assistant_id' in validatedData) {
      updateData.assigned_at = validatedData.assigned_assistant_id ? new Date().toISOString() : null
    }

    // Update phone number
    const { data: phoneNumber, error } = await supabase
      .from('user_phone_numbers')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        user_assistants!assigned_assistant_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: {
        ...phoneNumber,
        user_assistants: phoneNumber.user_assistants ? {
          id: phoneNumber.user_assistants.id,
          name: phoneNumber.user_assistants.name
        } : null
      },
      message: 'Phone number updated successfully'
    })
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

/**
 * DELETE /api/phone-numbers/[id]
 * Delete a phone number
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    // User is already authenticated, no additional permission check needed for now

    // Get phone number details before deletion
    const { data: phoneNumber } = await supabase
      .from('user_phone_numbers')
      .select('id, user_id, provider, provider_config')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' }
      }, { status: 404 })
    }

    // Soft delete (set is_active to false) rather than hard delete
    // This preserves call history and analytics
    const { error } = await supabase
      .from('user_phone_numbers')
      .update({
        is_active: false,
        assigned_assistant_id: null,
        assigned_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number deleted successfully'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}