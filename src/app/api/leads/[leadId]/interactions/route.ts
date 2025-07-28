import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for creating interactions
const CreateInteractionSchema = z.object({
  interaction_type: z.enum(['call', 'email', 'text', 'note', 'meeting', 'follow_up']),
  content: z.string().max(2000).optional(),
  scheduled_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
});

// Validation schema for updating interactions
const UpdateInteractionSchema = CreateInteractionSchema.partial();

// GET /api/leads/[leadId]/interactions - Get lead interactions
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { leadId } = params;
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const interactionType = searchParams.get('type');

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_leads');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view lead interactions',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Verify lead access
    let leadQuery = supabase
      .from('leads')
      .select('id, first_name, last_name')
      .eq('id', leadId);

    if (profile.team_id) {
      leadQuery = leadQuery.eq('team_id', profile.team_id);
    } else {
      leadQuery = leadQuery.eq('user_id', user.id);
    }

    const { data: lead, error: leadError } = await leadQuery.single();

    if (leadError || !lead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      }, { status: 404 });
    }

    // Get interactions
    let query = supabase
      .from('lead_interactions')
      .select(`
        *,
        user:profiles!lead_interactions_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .eq('lead_id', leadId);

    // Apply filters
    if (interactionType) {
      query = query.eq('interaction_type', interactionType);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: interactions, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          first_name: lead.first_name,
          last_name: lead.last_name,
        },
        interactions: interactions || [],
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/leads/[leadId]/interactions - Create a new interaction
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { leadId } = params;
    const body = await request.json();

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_leads');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create lead interactions',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = CreateInteractionSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Verify lead access
    let leadQuery = supabase
      .from('leads')
      .select('*')
      .eq('id', leadId);

    if (profile.team_id) {
      leadQuery = leadQuery.eq('team_id', profile.team_id);
    } else {
      leadQuery = leadQuery.eq('user_id', user.id);
    }

    const { data: lead, error: leadError } = await leadQuery.single();

    if (leadError || !lead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      }, { status: 404 });
    }

    // Create interaction
    const { data: interaction, error } = await supabase
      .from('lead_interactions')
      .insert({
        ...validatedData,
        lead_id: leadId,
        user_id: user.id,
        created_at: new Date().toISOString(),
      })
      .select(`
        *,
        user:profiles!lead_interactions_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Update lead's last contact time if completed interaction
    if (validatedData.completed_at || validatedData.interaction_type === 'note') {
      await supabase
        .from('leads')
        .update({
          last_contact_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'interaction_created',
      resource_type: 'lead_interaction',
      resource_id: interaction.id,
      new_values: {
        lead_id: leadId,
        interaction_type: validatedData.interaction_type,
        content: validatedData.content,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: interaction,
      message: 'Interaction created successfully',
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}