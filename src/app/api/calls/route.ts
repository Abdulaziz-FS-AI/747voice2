import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { vapiClient } from '@/lib/vapi';
import { z } from 'zod';

// Validation schema for creating outbound calls
const CreateCallSchema = z.object({
  assistant_id: z.string().uuid(),
  phone_number: z.string().min(10).max(20),
  customer_name: z.string().max(255).optional(),
});

// GET /api/calls - Get all calls for the user's team
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status');
    const assistantId = searchParams.get('assistant_id');
    const direction = searchParams.get('direction');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

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

    let query = supabase
      .from('calls')
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
      `, { count: 'exact' });

    // Filter by team
    if (profile.team_id) {
      query = query.eq('team_id', profile.team_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (assistantId) {
      query = query.eq('assistant_id', assistantId);
    }

    if (direction) {
      query = query.eq('direction', direction);
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

    const { data: calls, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: calls || [],
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

// POST /api/calls - Create an outbound call
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const body = await request.json();

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'manage_assistants');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to make calls',
        },
      }, { status: 403 });
    }

    // Validate input
    const validatedData = CreateCallSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Verify assistant access
    let assistantQuery = supabase
      .from('assistants')
      .select('*')
      .eq('id', validatedData.assistant_id)
      .eq('is_active', true);

    if (profile.team_id) {
      assistantQuery = assistantQuery.eq('team_id', profile.team_id);
    } else {
      assistantQuery = assistantQuery.eq('user_id', user.id);
    }

    const { data: assistant, error: assistantError } = await assistantQuery.single();

    if (assistantError || !assistant) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_NOT_FOUND',
          message: 'Assistant not found or inactive',
        },
      }, { status: 404 });
    }

    // Check if assistant has Vapi ID
    if (!assistant.vapi_assistant_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_NOT_CONFIGURED',
          message: 'Assistant is not properly configured with Vapi',
        },
      }, { status: 400 });
    }

    // Get available phone number for the team
    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('team_id', profile.team_id || user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_PHONE_NUMBER',
          message: 'No active phone number available for calls',
        },
      }, { status: 400 });
    }

    // Create call record first
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        assistant_id: assistant.id,
        phone_number_id: phoneNumber.id,
        user_id: user.id,
        team_id: profile.team_id,
        caller_number: validatedData.phone_number,
        caller_name: validatedData.customer_name,
        status: 'initiated',
        direction: 'outbound',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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

    if (callError) {
      throw callError;
    }

    // Make the call via Vapi
    let vapiCallId = null;
    if (vapiClient) {
      try {
        const vapiCall = await vapiClient.createCall({
          phoneNumberId: phoneNumber.vapi_phone_number_id,
          assistantId: assistant.vapi_assistant_id,
          customer: {
            number: validatedData.phone_number,
            name: validatedData.customer_name,
          },
        });

        vapiCallId = vapiCall.id;

        // Update call with Vapi ID
        await supabase
          .from('calls')
          .update({
            vapi_call_id: vapiCallId,
            status: 'ringing',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        call.vapi_call_id = vapiCallId;
        call.status = 'ringing';
      } catch (vapiError) {
        console.error('Failed to create Vapi call:', vapiError);
        
        // Update call status to failed
        await supabase
          .from('calls')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        return NextResponse.json({
          success: false,
          error: {
            code: 'CALL_CREATION_FAILED',
            message: 'Failed to initiate call with Vapi service',
            details: vapiError instanceof Error ? vapiError.message : 'Unknown error',
          },
        }, { status: 500 });
      }
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'call_initiated',
      resource_type: 'call',
      resource_id: call.id,
      new_values: {
        assistant_id: assistant.id,
        phone_number: validatedData.phone_number,
        customer_name: validatedData.customer_name,
        vapi_call_id: vapiCallId,
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      data: call,
      message: 'Call initiated successfully',
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}