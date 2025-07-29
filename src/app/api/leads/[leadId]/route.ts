import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for updating leads
const UpdateLeadSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  lead_type: z.enum(['buyer', 'seller', 'investor', 'renter']).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  property_type: z.array(z.string()).optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  preferred_locations: z.array(z.string()).optional(),
  timeline: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
  next_follow_up_at: z.string().datetime().optional(),
});

// GET /api/leads/[leadId] - Get specific lead details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { leadId } = params;

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_leads');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view leads',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get lead with access control
    let query = supabase
      .from('leads')
      .select(`
        *,
        call:calls(
          id,
          duration,
          status,
          created_at,
          vapi_call_id,
          assistant:assistants(
            id,
            name,
            personality
          )
        ),
        user:profiles!leads_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        interactions:lead_interactions(
          id,
          interaction_type,
          content,
          scheduled_at,
          completed_at,
          created_at,
          user:profiles!lead_interactions_user_id_fkey(
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', leadId);

    // Apply user filter (single-user architecture)
    query = query.eq('user_id', user.id);

    const { data: lead, error } = await query.single();

    if (error || !lead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      }, { status: 404 });
    }

    // Sort interactions by date
    if (lead.interactions) {
      lead.interactions.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Add follow-up status
    lead.follow_up_status = getFollowUpStatus(lead.next_follow_up_at);

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/leads/[leadId] - Update lead
export async function PUT(
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
          message: 'You do not have permission to update leads',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = UpdateLeadSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Get current lead data for access control and audit log
    const query = supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', user.id);

    const { data: currentLead, error: fetchError } = await query.single();

    if (fetchError || !currentLead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      }, { status: 404 });
    }

    // Check for phone number conflicts if phone is being updated
    if (validatedData.phone && validatedData.phone !== currentLead.phone) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', validatedData.phone)
        .eq('team_id', profile.team_id || user.id)
        .neq('id', leadId)
        .single();

      if (existingLead) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'DUPLICATE_PHONE',
            message: 'Another lead with this phone number already exists',
          },
        }, { status: 400 });
      }
    }

    // Update last_contact_at if status is being changed to 'contacted'
    const updates: any = { ...validatedData };
    if (validatedData.status === 'contacted' && currentLead.status !== 'contacted') {
      updates.last_contact_at = new Date().toISOString();
    }

    // Update lead
    const { data: updatedLead, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select(`
        *,
        call:calls(
          id,
          duration,
          status,
          created_at,
          assistant:assistants(
            id,
            name,
            personality
          )
        ),
        user:profiles!leads_user_id_fkey(
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

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'lead_updated',
      resource_type: 'lead',
      resource_id: leadId,
      old_values: {
        first_name: currentLead.first_name,
        last_name: currentLead.last_name,
        email: currentLead.email,
        phone: currentLead.phone,
        status: currentLead.status,
        lead_type: currentLead.lead_type,
      },
      new_values: validatedData,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: updatedLead,
      message: 'Lead updated successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/leads/[leadId] - Delete lead
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { leadId } = params;

    // Check permissions (only admins can delete leads)
    const hasPermission = await requirePermission(user.id, 'admin');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to delete leads',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Get lead for access control and audit log
    let query = supabase
      .from('leads')
      .select('*')
      .eq('id', leadId);

    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: lead, error: fetchError } = await query.single();

    if (fetchError || !lead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found',
        },
      }, { status: 404 });
    }

    // Log audit event before deletion
    await logAuditEvent({
      user_id: user.id,
      action: 'lead_deleted',
      resource_type: 'lead',
      resource_id: leadId,
      old_values: lead,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    // Delete lead (cascading deletes will handle interactions)
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// Helper function to determine follow-up status
function getFollowUpStatus(nextFollowUpAt: string | null): string {
  if (!nextFollowUpAt) return 'none';
  
  const now = new Date();
  const followUpDate = new Date(nextFollowUpAt);
  const diffHours = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 0) return 'overdue';
  if (diffHours <= 24) return 'due_soon';
  return 'scheduled';
}