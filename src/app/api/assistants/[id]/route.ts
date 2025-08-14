import { NextRequest, NextResponse } from 'next/server'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { validatePinSession } from '@/lib/pin-auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    // PIN-based authentication
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
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
    
    // PIN-based authentication
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const body = await request.json()
    const supabase = createServiceRoleClient('update_client_assistant')

    // Extract only allowed fields for update
    const allowedFields = {
      display_name: body.display_name,
      first_message: body.first_message,
      voice: body.voice,
      model: body.model,
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

    // Use the database function for safe updates
    const { data, error } = await supabase
      .rpc('update_assistant', {
        assistant_id_input: params.id,
        client_id_input: client_id,
        display_name_input: updateData.display_name,
        first_message_input: updateData.first_message,
        voice_input: updateData.voice,
        model_input: updateData.model,
        eval_method_input: updateData.eval_method,
        max_call_duration_input: updateData.max_call_duration
      });

    if (error) {
      console.error('[Update Assistant] Database error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found or access denied' }
      }, { status: 404 })
    }

    const result = data[0];
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: result.message }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result.updated_assistant,
      message: result.message
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