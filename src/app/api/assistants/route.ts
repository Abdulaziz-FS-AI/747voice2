import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, checkSubscriptionLimits, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';
import { EvaluationRubric } from '@/lib/structured-data';
// Removed prompt-builder imports for simplified schema

// Structured question schema
const StructuredQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  structuredName: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
  required: z.boolean()
});

// Validation schema for creating assistants (simplified)
const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(255),
  company_name: z.string().optional(),
  personality: z.enum(['professional', 'friendly', 'casual']).default('professional'),
  personality_traits: z.array(z.string()).optional().default(['professional']),
  model_id: z.string().optional().default('gpt-4.1-mini-2025-04-14'),
  voice_id: z.string().optional().default('Elliot'),
  max_call_duration: z.number().min(30).max(600).default(300), // Max 10 minutes
  first_message: z.string().min(1, 'First message is required'),
  first_message_mode: z.enum(['assistant-speaks-first', 'user-speaks-first']).default('assistant-speaks-first'),
  background_sound: z.enum(['off', 'office']).default('office'),
  structured_questions: z.array(StructuredQuestionSchema).optional().default([]),
  evaluation_rubric: z.enum([
    'NumericScale', 'DescriptiveScale', 'Checklist', 'Matrix', 
    'PercentageScale', 'LikertScale', 'AutomaticRubric', 'PassFail'
  ]).optional().nullable()
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

    // Generate system prompt with personality traits
    const personalityDescription = validatedData.personality_traits?.length > 0 
      ? validatedData.personality_traits.join(', ')
      : validatedData.personality;
    
    const systemPrompt = 
      `You are a ${personalityDescription} AI assistant for ${validatedData.company_name || 'the company'}. ` +
      `Help customers with their inquiries in a ${personalityDescription} manner. ` +
      `Your personality traits include: ${personalityDescription}.`;
    
    const firstMessage = validatedData.first_message;

    // Create assistant (using simplified schema)
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        personality: validatedData.personality,
        personality_traits: validatedData.personality_traits,
        company_name: validatedData.company_name,
        model_id: validatedData.model_id,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        first_message_mode: validatedData.first_message_mode,
        voice_id: validatedData.voice_id,
        max_call_duration: validatedData.max_call_duration,
        background_sound: validatedData.background_sound,
        structured_questions: validatedData.structured_questions,
        evaluation_rubric: validatedData.evaluation_rubric,
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
        modelId: validatedData.model_id,
        systemPrompt: systemPrompt,
        firstMessage: firstMessage,
        firstMessageMode: validatedData.first_message_mode,
        voiceId: validatedData.voice_id,
        maxDurationSeconds: validatedData.max_call_duration,
        backgroundSound: validatedData.background_sound,
        structuredQuestions: validatedData.structured_questions,
        evaluationRubric: validatedData.evaluation_rubric,
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