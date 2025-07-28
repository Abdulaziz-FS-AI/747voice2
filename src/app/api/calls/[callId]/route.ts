import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { vapiClient } from '@/lib/vapi';

// GET /api/calls/[callId] - Get specific call details
export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { user, profile } = await authenticateRequest();
    const { callId } = params;

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'view_calls');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view calls',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get call with access control
    let query = supabase
      .from('calls')
      .select(`
        *,
        assistant:assistants(
          id,
          name,
          personality,
          company_name
        ),
        user:profiles!calls_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        phone_number:phone_numbers(
          id,
          number,
          country_code
        ),
        transcripts:call_transcripts(
          id,
          content,
          speaker,
          timestamp_offset,
          created_at
        ),
        lead:leads(
          id,
          first_name,
          last_name,
          email,
          phone,
          lead_type,
          score,
          status
        )
      `)
      .eq('id', callId);

    // Apply team/user filter
    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: call, error } = await query.single();

    if (error || !call) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CALL_NOT_FOUND',
          message: 'Call not found',
        },
      }, { status: 404 });
    }

    // Sort transcripts by timestamp
    if (call.transcripts) {
      call.transcripts.sort((a: any, b: any) => a.timestamp_offset - b.timestamp_offset);
    }

    return NextResponse.json({
      success: true,
      data: call,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/calls/[callId] - Update call (mainly for adding notes or changing status)
export async function PUT(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { user, profile } = await authenticateRequest();
    const { callId } = params;
    const body = await request.json();

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_assistants');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update calls',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get current call data for access control and audit log
    let query = supabase
      .from('calls')
      .select('*')
      .eq('id', callId);

    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: currentCall, error: fetchError } = await query.single();

    if (fetchError || !currentCall) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CALL_NOT_FOUND',
          message: 'Call not found',
        },
      }, { status: 404 });
    }

    // Only allow updating certain fields manually
    const allowedUpdates = {
      caller_name: body.caller_name,
      // Add other fields that can be manually updated
    };

    // Remove undefined values
    const updates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_UPDATES',
          message: 'No valid updates provided',
        },
      }, { status: 400 });
    }

    // Update call
    const { data: updatedCall, error } = await supabase
      .from('calls')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select(`
        *,
        assistant:assistants(
          id,
          name,
          personality
        ),
        user:profiles!calls_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        phone_number:phone_numbers(
          id,
          number,
          country_code
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'call_updated',
      resource_type: 'call',
      resource_id: callId,
      old_values: {
        caller_name: currentCall.caller_name,
      },
      new_values: updates,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedCall,
      message: 'Call updated successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/calls/[callId] - Delete call (admin only, soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  try {
    const { user, profile } = await authenticateRequest();
    const { callId } = params;

    // Check permissions (only admins can delete calls)
    const hasPermission = await requirePermission(user.id, 'admin');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete calls',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get call for access control and audit log
    let query = supabase
      .from('calls')
      .select('*')
      .eq('id', callId);

    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: call, error: fetchError } = await query.single();

    if (fetchError || !call) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CALL_NOT_FOUND',
          message: 'Call not found',
        },
      }, { status: 404 });
    }

    // Check if call is still active
    if (['initiated', 'ringing', 'answered'].includes(call.status)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CALL_ACTIVE',
          message: 'Cannot delete an active call',
        },
      }, { status: 400 });
    }

    // Log audit event before deletion
    await logAuditEvent({
      user_id: user.id,
      action: 'call_deleted',
      resource_type: 'call',
      resource_id: callId,
      old_values: call,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    // Soft delete by updating status (you might want to add a deleted_at field)
    const { error } = await supabase
      .from('calls')
      .delete()
      .eq('id', callId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Call deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}