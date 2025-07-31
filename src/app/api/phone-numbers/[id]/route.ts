import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'

const updatePhoneNumberSchema = z.object({
  friendly_name: z.string().min(1).max(255).optional(),
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

    console.log(`Delete phone number request: ${params.id} for user: ${user.id}`)

    // Get phone number details before deletion
    const { data: phoneNumber, error: fetchError } = await supabase
      .from('user_phone_numbers')
      .select('id, user_id, phone_number, friendly_name, vapi_phone_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching phone number:', fetchError)
      return NextResponse.json({
        success: false,
        error: { code: 'FETCH_ERROR', message: `Database error: ${fetchError.message}` }
      }, { status: 500 })
    }

    if (!phoneNumber) {
      console.log(`Phone number ${params.id} not found for user ${user.id}`)
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Phone number not found' }
      }, { status: 404 })
    }

    console.log(`Found phone number: ${phoneNumber.phone_number} (${phoneNumber.friendly_name})`)

    // Delete from VAPI first if it has a vapi_phone_id
    const vapiDeletionStatus = { success: false, error: null as any }
    
    if (phoneNumber.vapi_phone_id) {
      try {
        console.log(`Deleting phone number ${phoneNumber.vapi_phone_id} from VAPI`)
        
        const response = await fetch(`https://api.vapi.ai/phone-number/${phoneNumber.vapi_phone_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          }
        })

        if (response.ok || response.status === 404) {
          // 404 means already deleted, which is fine
          vapiDeletionStatus.success = true
          console.log(`Successfully deleted phone number from VAPI`)
        } else {
          const errorData = await response.text()
          console.error(`VAPI deletion failed: ${response.status} - ${errorData}`)
          vapiDeletionStatus.error = `VAPI API error: ${response.status} - ${errorData}`
        }
      } catch (vapiError) {
        console.error('Error deleting from VAPI:', vapiError)
        vapiDeletionStatus.error = vapiError
      }
    } else {
      console.log('No VAPI phone ID, skipping VAPI deletion')
      vapiDeletionStatus.success = true // Consider it successful if no VAPI ID
    }

    // Delete from database completely
    const { error: deleteError } = await supabase
      .from('user_phone_numbers')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting phone number from database:', deleteError)
      return NextResponse.json({
        success: false,
        error: { code: 'DELETE_ERROR', message: `Failed to delete: ${deleteError.message}` }
      }, { status: 500 })
    }

    console.log(`Successfully deleted phone number ${params.id} (VAPI: ${vapiDeletionStatus.success ? 'success' : 'failed'})`)

    // Build response message
    let message = 'Phone number deleted successfully'
    if (!vapiDeletionStatus.success) {
      message += ` (Warning: VAPI deletion failed - ${vapiDeletionStatus.error})`
    }

    return NextResponse.json({
      success: true,
      message,
      details: {
        vapiDeletion: vapiDeletionStatus,
        phoneNumber: {
          id: phoneNumber.id,
          number: phoneNumber.phone_number,
          name: phoneNumber.friendly_name
        }
      }
    })
  } catch (error) {
    console.error('DELETE phone number error:', error)
    return handleAPIError(error)
  }
}