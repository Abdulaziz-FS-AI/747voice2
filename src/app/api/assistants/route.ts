import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission, checkSubscriptionLimits, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';

// Structured question schema
const StructuredQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  structuredName: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
  required: z.boolean()
});

// Validation schema for creating assistants (matching your database)
const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(255),
  company_name: z.string().optional(),
  personality: z.enum(['professional', 'friendly', 'casual']).default('professional'),
  personality_traits: z.array(z.string()).optional().default(['professional']),
  model_id: z.string().optional().default('gpt-4.1-mini-2025-04-14'),
  voice_id: z.string().optional().default('Elliot'),
  max_call_duration: z.number().min(30).max(600).default(300),
  first_message: z.string().min(1, 'First message is required'),
  first_message_mode: z.enum(['assistant-speaks-first', 'user-speaks-first']).default('assistant-speaks-first'),
  background_sound: z.enum(['off', 'office']).default('office'),
  structured_questions: z.array(StructuredQuestionSchema).optional().default([]),
  evaluation_rubric: z.enum([
    'NumericScale', 'DescriptiveScale', 'Checklist', 'Matrix', 
    'PercentageScale', 'LikertScale', 'AutomaticRubric', 'PassFail'
  ]).optional().nullable(),
  template_id: z.string().uuid().optional()
});

// GET /api/assistants - Get all assistants for the user's team
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search');
    // const isActive = searchParams.get('active'); // TODO: implement active filter

    const supabase = createServiceRoleClient();

    let query = supabase
      .from('user_assistants')
      .select('*', { count: 'exact' });

    // Filter by user
    query = query.eq('user_id', user.id);

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`);
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
    console.log('[Assistant API] Starting POST request');
    
    // Check for required environment variables
    if (!process.env.VAPI_API_KEY) {
      console.error('[Assistant API] Missing VAPI_API_KEY environment variable');
      return NextResponse.json({
        success: false,
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: 'VAPI API key is not configured' 
        }
      }, { status: 500 });
    }
    
    const { user } = await requirePermission('basic');
    console.log('[Assistant API] User authenticated:', user.id);
    
    // Ensure user profile exists (create if missing)
    const supabase = createServiceRoleClient();
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      console.log('[Assistant API] Creating missing user profile');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || 'unknown@example.com',
          full_name: user.user_metadata?.full_name || 'Unknown User'
        });
      
      if (profileError) {
        console.error('[Assistant API] Failed to create profile:', profileError);
        throw new Error('Failed to create user profile');
      }
    }
    
    const body = await request.json();
    console.log('[Assistant API] Request body received:', JSON.stringify(body, null, 2));

    // Check subscription limits
    await checkSubscriptionLimits(user.id, 'assistants', 1);
    console.log('[Assistant API] Subscription limits checked');

    // Validate input
    const validatedData = CreateAssistantSchema.parse(body);
    console.log('[Assistant API] Data validated successfully');

    let systemPrompt: string;
    const firstMessage: string = validatedData.first_message;

    // Check if using a template
    if (validatedData.template_id) {
      console.log('[Assistant API] Fetching template:', validatedData.template_id);
      
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', validatedData.template_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('[Assistant API] Template not found:', templateError);
        throw new Error('Template not found');
      }

      console.log('[Assistant API] Using template:', template.name);
      systemPrompt = template.base_prompt;

      // Process customizable fields from template
      const customizableFields = template.customizable_fields || {};
      
      // Create replacements object
      const replacements: Record<string, string> = {
        ASSISTANT_NAME: validatedData.name || 'Assistant',
        COMPANY_NAME: validatedData.company_name || 'the company',
        PERSONALITY: validatedData.personality_traits?.join(', ') || 'professional',
        ...customizableFields // Include any template-specific defaults
      };

      // Replace placeholders in system prompt (supports {FIELD_NAME} format)
      Object.entries(replacements).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        systemPrompt = systemPrompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
      });

      console.log('[Assistant API] Processed system prompt with template customizations');
    } else {
      // Generate default system prompt without template
      const personalityDescription = validatedData.personality_traits?.length > 0 
        ? validatedData.personality_traits.join(', ')
        : validatedData.personality;
      
      systemPrompt = 
        `You are an AI assistant${validatedData.company_name ? ` working for ${validatedData.company_name}` : ''}. ` +
        `Your personality should be ${personalityDescription}. ` +
        (validatedData.structured_questions?.length > 0 
          ? `\\n\\nIMPORTANT: During the conversation, naturally gather the following information:\\n` +
            validatedData.structured_questions.map(q => 
              `- ${q.question} (${q.required ? 'Required' : 'Optional'})`
            ).join('\\n') +
            `\\n\\nGather this information naturally during the conversation without sounding like an interview.`
          : '') +
        `\\n\\nAlways maintain a ${personalityDescription} tone throughout the conversation.`;
    }

    console.log('[Assistant API] System prompt generated');

    // Create assistant in VAPI first (required for vapi_assistant_id)
    console.log('[Assistant API] Creating assistant in VAPI...');
    let vapiAssistantId: string;
    try {
      // Log the data being sent to VAPI (without sensitive info)
      console.log('[Assistant API] VAPI creation data:', {
        name: validatedData.name,
        modelId: validatedData.model_id,
        voiceId: validatedData.voice_id,
        maxDurationSeconds: validatedData.max_call_duration,
        backgroundSound: validatedData.background_sound,
        hasStructuredQuestions: validatedData.structured_questions?.length > 0,
        evaluationRubric: validatedData.evaluation_rubric
      });

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
      console.log('[Assistant API] VAPI assistant created successfully:', vapiAssistantId);
    } catch (vapiError) {
      console.error('[Assistant API] VAPI creation failed:', vapiError);
      
      // Log more detailed error information
      if (vapiError instanceof Error) {
        console.error('[Assistant API] VAPI error name:', vapiError.name);
        console.error('[Assistant API] VAPI error message:', vapiError.message);
        console.error('[Assistant API] VAPI error stack:', vapiError.stack);
      }
      
      // Check if it's a specific VAPI error with details
      if (vapiError && typeof vapiError === 'object' && 'details' in vapiError) {
        console.error('[Assistant API] VAPI error details:', vapiError.details);
      }
      
      throw new Error('Failed to create assistant in VAPI: ' + (vapiError instanceof Error ? vapiError.message : 'Unknown error'));
    }

    // Build config object with all assistant settings
    const config = {
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
    };

    // Insert into database with VAPI ID
    const insertData = {
      user_id: user.id,
      name: validatedData.name,
      template_id: validatedData.template_id || null,
      vapi_assistant_id: vapiAssistantId,
      config: config
    };
    
    console.log('[Assistant API] Inserting into database...');
    const { data: assistant, error } = await supabase
      .from('user_assistants')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      console.error('[Assistant API] Database insert error:', error);
      
      // TODO: Rollback VAPI assistant creation if needed
      
      throw error;
    }
    
    console.log('[Assistant API] Assistant created in database:', assistant.id);

    // Save structured questions if provided
    if (validatedData.structured_questions && validatedData.structured_questions.length > 0) {
      console.log('[Assistant API] Saving structured questions:', validatedData.structured_questions.length);
      
      const questionsToInsert = validatedData.structured_questions.map((q, index) => ({
        assistant_id: assistant.id,
        form_title: 'Assistant Questions',
        question_text: q.question,
        structured_name: q.structuredName,
        data_type: q.type,
        is_required: q.required,
        order_index: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('structured_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('[Assistant API] Error saving structured questions:', questionsError);
      } else {
        console.log('[Assistant API] Structured questions saved successfully');
      }
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
    console.error('[Assistant API] Error in POST:', error);
    console.error('[Assistant API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[Assistant API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error && 'cause' in error ? error.cause : undefined,
    });
    return handleAPIError(error);
  }
}