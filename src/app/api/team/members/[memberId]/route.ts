import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for updating team member
const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'agent', 'viewer']).optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

// GET /api/team/members/[memberId] - Get specific team member
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { memberId } = params;

    if (!profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_TEAM',
          message: 'User is not associated with any team',
        },
      }, { status: 404 });
    }

    const supabase = createServiceRoleClient();

    // Get team member
    const { data: member, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        created_at,
        updated_at
      `)
      .eq('id', memberId)
      .eq('team_id', profile.team_id)
      .single();

    if (error || !member) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Team member not found',
        },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/team/members/[memberId] - Update team member
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { memberId } = params;
    const body = await request.json();

    if (!profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_TEAM',
          message: 'User is not associated with any team',
        },
      }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_team');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to update team members',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = UpdateMemberSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Get current member data
    const { data: currentMember, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', profile.team_id)
      .single();

    if (fetchError || !currentMember) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Team member not found',
        },
      }, { status: 404 });
    }

    // Prevent users from changing their own role
    if (memberId === user.id && validatedData.role) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CANNOT_CHANGE_OWN_ROLE',
          message: 'You cannot change your own role',
        },
      }, { status: 400 });
    }

    // Check if this is the last admin and we're trying to remove admin role
    if (currentMember.role === 'admin' && validatedData.role && validatedData.role !== 'admin') {
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', profile.team_id)
        .eq('role', 'admin');

      if (adminCount === 1) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'LAST_ADMIN',
            message: 'Cannot remove the last admin from the team',
          },
        }, { status: 400 });
      }
    }

    // Update member
    const { data: updatedMember, error } = await supabase
      .from('profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId)
      .eq('team_id', profile.team_id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'member_updated',
      resource_type: 'team_member',
      resource_id: memberId,
      old_values: {
        role: currentMember.role,
        first_name: currentMember.first_name,
        last_name: currentMember.last_name,
      },
      new_values: validatedData,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Team member updated successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/team/members/[memberId] - Remove team member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { memberId } = params;

    if (!profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_TEAM',
          message: 'User is not associated with any team',
        },
      }, { status: 404 });
    }

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_team');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to remove team members',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get member to remove
    const { data: memberToRemove, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .eq('team_id', profile.team_id)
      .single();

    if (fetchError || !memberToRemove) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Team member not found',
        },
      }, { status: 404 });
    }

    // Prevent removing yourself
    if (memberId === user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_SELF',
          message: 'You cannot remove yourself from the team',
        },
      }, { status: 400 });
    }

    // Check if this is the last admin
    if (memberToRemove.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', profile.team_id)
        .eq('role', 'admin');

      if (adminCount === 1) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'LAST_ADMIN',
            message: 'Cannot remove the last admin from the team',
          },
        }, { status: 400 });
      }
    }

    // Remove member from team (set team_id to null)
    const { error } = await supabase
      .from('profiles')
      .update({
        team_id: null,
        role: 'admin', // Reset to admin for their own future team
        updated_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      throw error;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'member_removed',
      resource_type: 'team_member',
      resource_id: memberId,
      old_values: memberToRemove,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}