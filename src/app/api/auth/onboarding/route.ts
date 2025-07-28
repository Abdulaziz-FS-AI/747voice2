import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for onboarding completion
const OnboardingSchema = z.object({
  team_name: z.string().min(1).max(255),
  team_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  company_name: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  industry: z.string().max(100).optional(),
  team_size: z.enum(['1', '2-5', '6-20', '21-50', '50+']).optional(),
  use_case: z.string().max(500).optional(),
});

// POST /api/auth/onboarding - Complete user onboarding
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const body = await request.json();

    // Check if onboarding is already completed
    if (profile.onboarding_completed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ONBOARDING_ALREADY_COMPLETED',
          message: 'Onboarding has already been completed',
        },
      }, { status: 400 });
    }

    // Validate input
    const validatedData = OnboardingSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Check if team slug is available
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', validatedData.team_slug)
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

    // Create team using the database function
    const { data: teamId, error: teamError } = await supabase
      .rpc('create_default_team', {
        user_id: user.id,
        team_name: validatedData.team_name,
        team_slug: validatedData.team_slug,
      });

    if (teamError) {
      throw teamError;
    }

    // Update profile with additional onboarding data
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update({
        company_name: validatedData.company_name || profile.company_name,
        phone: validatedData.phone || profile.phone,
        onboarding_completed: true,
        preferences: {
          ...(profile.preferences as Record<string, unknown> || {}),
          industry: validatedData.industry,
          team_size: validatedData.team_size,
          use_case: validatedData.use_case,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select(`
        *,
        team:teams(*)
      `)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'onboarding_completed',
      resource_type: 'profile',
      resource_id: user.id,
      new_values: {
        team_id: teamId,
        team_name: validatedData.team_name,
        team_slug: validatedData.team_slug,
        onboarding_data: validatedData,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// GET /api/auth/onboarding - Get onboarding status
export async function GET() {
  try {
    const { profile } = await authenticateRequest();

    return NextResponse.json({
      success: true,
      data: {
        onboarding_completed: profile.onboarding_completed,
        has_team: !!profile.team_id,
        trial_ends_at: profile.trial_ends_at,
        subscription_status: profile.subscription_status,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}