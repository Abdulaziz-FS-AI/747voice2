import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for profile updates
const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  company_name: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  preferences: z.record(z.any()).optional(),
});

// GET /api/auth/profile - Get current user profile
export async function GET() {
  try {
    const { user, profile } = await authenticateRequest();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        profile,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/auth/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const body = await request.json();

    // Validate input
    const validatedData = UpdateProfileSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Store old values for audit log
    const oldValues = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      company_name: profile.company_name,
      phone: profile.phone,
      preferences: profile.preferences,
    };

    // Update profile
    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select(`
        *,
        team:teams(*)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'profile_updated',
      resource_type: 'profile',
      resource_id: user.id,
      old_values: oldValues,
      new_values: validatedData,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/auth/profile - Delete current user account
export async function DELETE(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();

    const supabase = createServiceRoleClient();

    // Log audit event before deletion
    await logAuditEvent({
      user_id: user.id,
      action: 'account_deleted',
      resource_type: 'profile',
      resource_id: user.id,
      old_values: profile,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    // Delete the user from auth.users (this will cascade delete the profile)
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}