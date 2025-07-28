import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { vapiClient } from '@/lib/vapi'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*, assistant_questions(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: assistant
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await requirePermission()
    const body = await request.json()
    const supabase = createServiceRoleClient()

    // Verify ownership
    const { data: existing } = await supabase
      .from('assistants')
      .select('id, vapi_assistant_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    // Update in database
    const { data: assistant, error } = await supabase
      .from('assistants')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // If toggling active status and has Vapi ID, update in Vapi
    if ('is_active' in body && existing.vapi_assistant_id) {
      try {
        // Vapi doesn't have enable/disable, but we track it locally
        // Could implement by updating the assistant's configuration
      } catch (vapiError) {
        console.error('Failed to update Vapi assistant:', vapiError)
      }
    }

    return NextResponse.json({
      success: true,
      data: assistant
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await requirePermission()
    const supabase = createServiceRoleClient()

    // Get assistant details
    const { data: assistant } = await supabase
      .from('assistants')
      .select('id, vapi_assistant_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    // Delete from Vapi if exists
    if (assistant.vapi_assistant_id && vapiClient) {
      try {
        await vapiClient.deleteAssistant(assistant.vapi_assistant_id)
      } catch (vapiError) {
        console.error('Failed to delete from Vapi:', vapiError)
        // Continue with local deletion even if Vapi fails
      }
    }

    // Delete from database (cascades to questions)
    const { error } = await supabase
      .from('assistants')
      .delete()
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Assistant deleted successfully'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}