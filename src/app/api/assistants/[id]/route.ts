import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { validatePinFromRequest } from '@/lib/pin-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    // SIMPLIFIED PIN-based authentication (no sessions)
    const pinResult = await validatePinFromRequest(request);
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 });
    }

    const { client_id } = pinResult;
    const supabase = createServiceRoleClient('get_client_assistant')

    const { data: assistant, error } = await supabase
      .from('client_assistants')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', client_id)
      .eq('is_active', true)
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
    
    // SIMPLIFIED PIN-based authentication (no sessions)
    const pinResult = await validatePinFromRequest(request);
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 });
    }

    const { client_id } = pinResult;
    const body = await request.json()
    const supabase = createServiceRoleClient('update_client_assistant')

    // Extract only allowed fields for update (removed display_name and model)
    const allowedFields = {
      first_message: body.first_message,
      voice: body.voice,
      eval_method: body.eval_method,
      max_call_duration: body.max_call_duration
    };

    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'No valid fields to update' }
      }, { status: 400 })
    }

    // Get the assistant to get VAPI assistant ID
    const { data: assistant, error: assistantError } = await supabase
      .from('client_assistants')
      .select('*')
      .eq('id', params.id)
      .eq('client_id', client_id)
      .single()

    if (assistantError || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found or not accessible' }
      }, { status: 404 })
    }

    // Build VAPI update payload using correct VAPI API structure
    const vapiUpdateData: any = {}
    
    if (updateData.first_message !== undefined) {
      vapiUpdateData.firstMessage = updateData.first_message
    }
    
    if (updateData.voice !== undefined) {
      vapiUpdateData.voice = {
        provider: 'vapi',
        voiceId: updateData.voice
      }
    }
    
    if (updateData.max_call_duration !== undefined) {
      vapiUpdateData.maxDurationSeconds = updateData.max_call_duration
    }
    
    if (updateData.eval_method !== undefined) {
      vapiUpdateData.analysisPlan = {
        successEvaluationPlan: {
          rubric: updateData.eval_method,
          enabled: true,
          timeoutSeconds: 30
        }
      }
    }

    // Update VAPI assistant if we have mappable fields
    if (Object.keys(vapiUpdateData).length > 0 && process.env.VAPI_API_KEY) {
      try {
        console.log('[VAPI] Sending update to VAPI:', {
          assistantId: assistant.vapi_assistant_id,
          payload: vapiUpdateData
        })
        
        const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistant.vapi_assistant_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(vapiUpdateData)
        })

        if (!vapiResponse.ok) {
          const errorData = await vapiResponse.text()
          console.error('[VAPI] Update failed:', {
            status: vapiResponse.status,
            statusText: vapiResponse.statusText,
            error: errorData
          })
          // Continue with local update even if VAPI fails
        } else {
          console.log('[VAPI] Update successful:', {
            assistantId: assistant.vapi_assistant_id,
            status: vapiResponse.status
          })
        }
      } catch (vapiError) {
        console.error('[VAPI] Update error:', vapiError)
        // Continue with local update even if VAPI fails
      }
    }

    // Update local database record
    const { data: updatedAssistant, error: updateError } = await supabase
      .from('client_assistants')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('client_id', client_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('[DB] Assistant update failed:', updateError)
      return NextResponse.json({
        success: false,
        error: { code: 'DB_ERROR', message: 'Failed to update assistant in database' }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedAssistant,
      message: 'Assistant updated successfully'
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// DELETE /api/assistants/[id] - DISABLED: No deletion allowed for clients
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    success: false,
    error: {
      code: 'OPERATION_NOT_ALLOWED',
      message: 'Assistant deletion is disabled. Assistants are managed by administrators only.'
    }
  }, { status: 403 });
}