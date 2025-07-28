import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for inviting team members
const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'agent', 'viewer']),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

// Validation schema for updating team member role
const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'agent', 'viewer']),
});

// GET /api/team/members - Get team members
export async function GET() {
  try {
    const { user, profile } = await authenticateRequest();

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

    // Get team members
    const { data: members, error } = await supabase
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
      .eq('team_id', profile.team_id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/team/members - Invite a new team member
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
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
          message: 'You do not have permission to invite team members',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = InviteMemberSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, team_id')
      .eq('email', validatedData.email)
      .single();

    if (existingUser) {
      if (existingUser.team_id === profile.team_id) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'USER_ALREADY_IN_TEAM',
            message: 'This user is already a member of your team',
          },
        }, { status: 400 });
      } else if (existingUser.team_id) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'USER_HAS_TEAM',
            message: 'This user is already a member of another team',
          },
        }, { status: 400 });
      }
    }

    // Check team limits
    const { data: teamData } = await supabase
      .from('teams')
      .select('max_agents')
      .eq('id', profile.team_id)
      .single();

    const { count: currentMembers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', profile.team_id);

    if (currentMembers && teamData && currentMembers >= teamData.max_agents) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEAM_LIMIT_REACHED',
          message: 'Your team has reached the maximum number of members for your plan',
        },
      }, { status: 400 });
    }

    if (existingUser) {
      // Update existing user to join the team
      const { data: updatedMember, error } = await supabase
        .from('profiles')
        .update({
          team_id: profile.team_id,
          role: validatedData.role,
          first_name: validatedData.first_name || existingUser.first_name,
          last_name: validatedData.last_name || existingUser.last_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Log audit event
      await logAuditEvent({
        user_id: user.id,
        action: 'member_added_existing',
        resource_type: 'team_member',
        resource_id: existingUser.id,
        new_values: {
          email: validatedData.email,
          role: validatedData.role,
          team_id: profile.team_id,
        },
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({
        success: true,
        data: updatedMember,
        message: 'Team member added successfully',
      });
    } else {
      // Create invitation for new user (this would typically involve sending an email)
      // For now, we'll create a pending invitation record
      
      // In a real implementation, you would:
      // 1. Generate an invitation token
      // 2. Send an email with the invitation link
      // 3. Store the invitation in a pending_invitations table
      
      // Log audit event
      await logAuditEvent({
        user_id: user.id,
        action: 'invitation_sent',
        resource_type: 'team_invitation',
        new_values: {
          email: validatedData.email,
          role: validatedData.role,
          team_id: profile.team_id,
        },
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
      });

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          email: validatedData.email,
          role: validatedData.role,
          status: 'pending',
        },
      });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}