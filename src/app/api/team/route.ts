import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for team updates
const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

// GET /api/team - Get current team information
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

    // Get team with usage statistics
    const { data: team, error } = await supabase
      .from('teams')
      .select(`
        *,
        profiles!profiles_team_id_fkey(
          id,
          email,
          first_name,
          last_name,
          role,
          created_at
        )
      `)
      .eq('id', profile.team_id)
      .single();

    if (error) {
      throw error;
    }

    // Get usage statistics
    const { data: usage, error: usageError } = await supabase
      .rpc('get_team_usage', { p_team_id: profile.team_id });

    if (usageError) {
      console.warn('Failed to get usage statistics:', usageError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        usage: usage?.[0] || {
          current_agents: 0,
          current_assistants: 0,
          current_month_minutes: 0,
          current_month_calls: 0,
        },
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/team - Update team information
export async function PUT(request: NextRequest) {
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
          message: 'You do not have permission to manage this team',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = UpdateTeamSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Check if new slug is available (if provided)
    if (validatedData.slug) {
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('slug', validatedData.slug)
        .neq('id', profile.team_id)
        .single();

      if (existingTeam) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'TEAM_SLUG_TAKEN',
            message: 'This team name is already taken. Please choose a different one.',
          },
        }, { status: 400 });
      }
    }

    // Get current team data for audit log
    const { data: oldTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('id', profile.team_id)
      .single();

    // Update team
    const { data: updatedTeam, error } = await supabase
      .from('teams')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.team_id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'team_updated',
      resource_type: 'team',
      resource_id: profile.team_id,
      old_values: oldTeam,
      new_values: validatedData,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/team - Delete team (admin only)
export async function DELETE(request: NextRequest) {
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

    // Check if user is team owner
    const { data: team } = await supabase
      .from('teams')
      .select('owner_id')
      .eq('id', profile.team_id)
      .single();

    if (!team || team.owner_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only the team owner can delete the team',
        },
      }, { status: 403 });
    }

    // Log audit event before deletion
    await logAuditEvent({
      user_id: user.id,
      action: 'team_deleted',
      resource_type: 'team',
      resource_id: profile.team_id,
      old_values: team,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    // Delete team (cascading deletes will handle related data)
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', profile.team_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}