import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for creating leads
const CreateLeadSchema = z.object({
  call_id: z.string().uuid().optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20),
  lead_type: z.enum(['buyer', 'seller', 'investor', 'renter']).optional(),
  lead_source: z.string().max(100).default('manual'),
  property_type: z.array(z.string()).optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  preferred_locations: z.array(z.string()).optional(),
  timeline: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

// Validation schema for updating leads
const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  next_follow_up_at: z.string().datetime().optional(),
});

// GET /api/leads - Get all leads for the user's team
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const leadType = searchParams.get('lead_type');
    const leadSource = searchParams.get('lead_source');
    const minScore = searchParams.get('min_score');
    const maxScore = searchParams.get('max_score');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

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

    let query = supabase
      .from('leads')
      .select(`
        *,
        call:calls(
          id,
          duration,
          status,
          created_at,
          assistant:assistants(
            id,
            name
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
          completed_at,
          created_at
        )
      `, { count: 'exact' });

    // Filter by team
    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (leadType) {
      query = query.eq('lead_type', leadType);
    }

    if (leadSource) {
      query = query.eq('lead_source', leadSource);
    }

    if (minScore) {
      query = query.gte('score', parseInt(minScore));
    }

    if (maxScore) {
      query = query.lte('score', parseInt(maxScore));
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Apply sorting
    const ascending = sortOrder === 'asc';
    const { data: leads, error, count } = await query
      .range(from, to)
      .order(sortBy, { ascending });

    if (error) {
      throw error;
    }

    // Calculate follow-up status for each lead
    const leadsWithStatus = leads?.map(lead => ({
      ...lead,
      follow_up_status: getFollowUpStatus(lead.next_follow_up_at),
      last_interaction: lead.interactions?.[0] || null,
    })) || [];

    return NextResponse.json({
      success: true,
      data: leadsWithStatus,
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

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const body = await request.json();

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_leads');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to create leads',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = CreateLeadSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Check if call exists and belongs to user (if call_id provided)
    if (validatedData.call_id) {
      let callQuery = supabase
        .from('calls')
        .select('id, user_id, team_id')
        .eq('id', validatedData.call_id);

      if (profile.team_id) {
        callQuery = callQuery.eq('team_id', profile.team_id);
      } else {
        callQuery = callQuery.eq('user_id', user.id);
      }

      const { data: call, error: callError } = await callQuery.single();

      if (callError || !call) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'CALL_NOT_FOUND',
            message: 'Associated call not found',
          },
        }, { status: 404 });
      }
    }

    // Check for duplicate leads by phone number
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', validatedData.phone)
      .eq('team_id', profile.team_id || user.id)
      .single();

    if (existingLead) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_LEAD',
          message: 'A lead with this phone number already exists',
          details: { existing_lead_id: existingLead.id },
        },
      }, { status: 400 });
    }

    // Create lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        ...validatedData,
        user_id: user.id,
        team_id: profile.team_id,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        call:calls(
          id,
          duration,
          status,
          created_at,
          assistant:assistants(
            id,
            name
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
      action: 'lead_created',
      resource_type: 'lead',
      resource_id: lead.id,
      new_values: validatedData,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
    }, { status: 201 });
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