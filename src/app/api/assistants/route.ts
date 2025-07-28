import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, checkSubscriptionLimits, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';
import { PromptBuilder, buildVapiFunctions } from '@/lib/prompt-builder';
import type { AssistantCustomization, QuestionData } from '@/lib/prompt-builder';

// Validation schema for creating assistants
const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(255),
  agentName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(255),
  tone: z.enum(['professional', 'friendly', 'casual']),
  customInstructions: z.string().optional(),
  voiceId: z.string().max(100),
  maxCallDuration: z.number().min(30).max(3600).default(300),
  language: z.string().max(10).default('en-US'),
  templateId: z.string().uuid().optional(),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    answerDescription: z.string(),
    structuredFieldName: z.string(),
    fieldType: z.enum(['string', 'number', 'boolean']),
    isRequired: z.boolean(),
    displayOrder: z.number()
  })).default([])
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
      .select(`
        *,
        user:profiles!assistants_user_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' });

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

    // Get prompt template
    let promptTemplate;
    if (validatedData.templateId) {
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', validatedData.templateId)
        .eq('is_active', true)
        .single();
      
      promptTemplate = template;
    } else {
      // Use default real estate template
      const { data: template } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('industry', 'real_estate')
        .eq('is_active', true)
        .single();
      
      promptTemplate = template;
    }

    if (!promptTemplate) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found',
        },
      }, { status: 400 });
    }

    // Build system prompt using PromptBuilder
    const customization: AssistantCustomization = {
      agentName: validatedData.agentName,
      companyName: validatedData.companyName,
      tone: validatedData.tone,
      customInstructions: validatedData.customInstructions,
      questions: validatedData.questions
    };

    const systemPrompt = PromptBuilder.buildSystemPrompt(promptTemplate, customization);
    const firstMessage = PromptBuilder.buildFirstMessage(promptTemplate, customization);

    // Create assistant
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        prompt_template_id: promptTemplate.id,
        name: validatedData.name,
        agent_name: validatedData.agentName,
        company_name: validatedData.companyName,
        tone: validatedData.tone,
        custom_instructions: validatedData.customInstructions,
        generated_system_prompt: systemPrompt,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        voice_id: validatedData.voiceId,
        max_call_duration: validatedData.maxCallDuration,
        language: validatedData.language,
        personality: 'professional', // Default
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        user:profiles!assistants_user_id_fkey(
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

    // Save custom questions if any
    if (validatedData.questions.length > 0) {
      const questionsToInsert = validatedData.questions.map(q => ({
        assistant_id: assistant.id,
        question_text: q.questionText,
        answer_description: q.answerDescription,
        structured_field_name: q.structuredFieldName,
        field_type: q.fieldType,
        is_required: q.isRequired,
        display_order: q.displayOrder
      }));

      const { error: questionsError } = await supabase
        .from('assistant_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error saving questions:', questionsError);
      }
    }

    // Create assistant in Vapi
    let vapiAssistantId = null;
    try {
      // Build Vapi functions from questions
      const vapiFunctions = buildVapiFunctions(validatedData.questions);
      
      vapiAssistantId = await createVapiAssistant({
        name: validatedData.name,
        systemPrompt: systemPrompt,
        firstMessage: firstMessage,
        voiceId: validatedData.voiceId,
        language: validatedData.language,
        maxDurationSeconds: validatedData.maxCallDuration,
        functions: vapiFunctions,
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