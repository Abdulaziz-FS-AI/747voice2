import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, checkSubscriptionLimits, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';
// Removed prompt-builder imports for simplified schema

// Validation schema for creating assistants (simplified)
const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(255),
  company_name: z.string().optional(),
  personality: z.enum(['professional', 'friendly', 'casual']).default('professional'),
  system_prompt: z.string().optional(),
  voice_id: z.string().optional(),
  max_call_duration: z.number().min(30).max(3600).default(300),
  language: z.string().max(10).default('en-US'),
  first_message: z.string().optional(),
  background_ambiance: z.string().default('office')
});

// Validation schema for updating assistants
const UpdateAssistantSchema = CreateAssistantSchema.partial();

// GET /api/assistants - Get all assistants for the user's team
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search');
    const isActive = searchParams.get('active');
    const personality = searchParams.get('personality');

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('assistants')
      .select('*', { count: 'exact' });

    // Filter by user (single-user architecture)
    query = query.eq('user_id', user.id);

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (personality) {
      query = query.eq('personality', personality);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: assistants, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: assistants || [],
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

// POST /api/assistants - Create a new assistant
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requirePermission('basic');
    const body = await request.json();

    // Check subscription limits
    await checkSubscriptionLimits(user.id, 'assistants', 1);

    // Validate input
    const validatedData = CreateAssistantSchema.parse(body);

    const supabase = createServiceRoleClient();

    // Generate system prompt (simplified - no templates needed)
    const systemPrompt = validatedData.system_prompt || 
      `You are a ${validatedData.personality} AI assistant for ${validatedData.company_name || 'the company'}. ` +
      `Help customers with their inquiries in a ${validatedData.personality} manner.`;
    
    const firstMessage = validatedData.first_message || 
      `Hello! I'm here to help you. How can I assist you today?`;

    // Create assistant (using simplified schema)
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        personality: validatedData.personality,
        company_name: validatedData.company_name,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        voice_id: validatedData.voice_id,
        max_call_duration: validatedData.max_call_duration,
        language: validatedData.language,
        background_ambiance: validatedData.background_ambiance,
        is_active: true
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Questions functionality removed for simplified schema

    // Create assistant in Vapi
    let vapiAssistantId = null;
    try {
      vapiAssistantId = await createVapiAssistant({
        name: validatedData.name,
        systemPrompt: systemPrompt,
        firstMessage: firstMessage,
        voiceId: validatedData.voice_id,
        language: validatedData.language,
        maxDurationSeconds: validatedData.max_call_duration,
      });

      // Update the assistant with the Vapi ID
      if (vapiAssistantId) {
        await supabase
          .from('assistants')
          .update({ vapi_assistant_id: vapiAssistantId })
          .eq('id', assistant.id);
        
        assistant.vapi_assistant_id = vapiAssistantId;
      }
    } catch (vapiError) {
      console.error('Failed to create Vapi assistant:', vapiError);
      // Mark assistant as inactive since Vapi deployment failed
      await supabase
        .from('assistants')
        .update({ is_active: false })
        .eq('id', assistant.id);
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'VAPI_DEPLOYMENT_FAILED',
          message: 'Assistant created locally but Vapi deployment failed',
          details: vapiError instanceof Error ? vapiError.message : 'Unknown error',
          assistantId: assistant.id,
          canRetry: true
        },
      }, { status: 207 }); // Partial success
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'assistant_created',
      resource_type: 'assistant',
      resource_id: assistant.id,
      new_values: {
        name: assistant.name,
        vapi_assistant_id: vapiAssistantId
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: assistant,
      message: 'Assistant created successfully',
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}