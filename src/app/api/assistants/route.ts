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

// Validation schema for creating assistants
const CreateAssistantSchema = z.object({
  name: z.string().min(1).max(255),
  company_name: z.string().optional().nullable(),
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
  client_messages: z.array(z.string()).optional().default(['end-of-call-report']),
  template_id: z.string().uuid().optional().nullable()
});

// GET /api/assistants - Get all assistants for the user
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search');

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
      console.error('[Assistant API] Database query error:', error);
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
  let vapiAssistantId: string | null = null;
  let assistantCreated = false;
  
  try {
    console.log('[Assistant API] Starting POST request');
    
    // Step 1: Validate environment configuration
    const requiredEnvVars = {
      VAPI_API_KEY: process.env.VAPI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    
    if (missingEnvVars.length > 0) {
      console.error('[Assistant API] Missing environment variables:', missingEnvVars);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: 'Server configuration is incomplete. Please contact support.',
          details: process.env.NODE_ENV === 'development' ? { missing: missingEnvVars } : undefined
        }
      }, { status: 500 });
    }
    
    // Step 2: Authenticate user
    let user;
    try {
      const authResult = await requirePermission('basic');
      user = authResult.user;
      console.log('[Assistant API] User authenticated:', user.id);
    } catch (authError) {
      console.error('[Assistant API] Authentication failed:', authError);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'AUTH_ERROR', 
          message: 'Authentication required. Please log in again.' 
        }
      }, { status: 401 });
    }
    
    // Step 3: Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('[Assistant API] Request body received');
    } catch (parseError) {
      console.error('[Assistant API] Failed to parse request body:', parseError);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INVALID_REQUEST', 
          message: 'Invalid request format' 
        }
      }, { status: 400 });
    }

    // Step 4: Validate input data
    let validatedData;
    try {
      validatedData = CreateAssistantSchema.parse(body);
      console.log('[Assistant API] Data validated successfully');
    } catch (validationError) {
      console.error('[Assistant API] Validation failed:', validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid input data',
            details: validationError.issues 
          }
        }, { status: 400 });
      }
      throw validationError;
    }

    // Step 5: Ensure user profile exists
    const supabase = createServiceRoleClient();
    try {
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
          // Continue anyway - profile might exist
        }
      }
    } catch (profileError) {
      console.warn('[Assistant API] Profile check failed, continuing:', profileError);
    }
    
    // Step 6: Check subscription limits
    try {
      await checkSubscriptionLimits(user.id, 'assistants', 1);
      console.log('[Assistant API] Subscription limits checked');
    } catch (limitError) {
      console.warn('[Assistant API] Subscription check failed, continuing:', limitError);
      // Continue anyway - don't block assistant creation
    }

    // Step 7: Build system prompt
    const firstMessage: string = validatedData.first_message;

    // For now, use a simple default prompt without template dependency
    const personalityDescription = validatedData.personality_traits?.length > 0 
      ? validatedData.personality_traits.join(', ')
      : validatedData.personality;
    
    const systemPrompt = 
      `You are an AI assistant${validatedData.company_name ? ` working for ${validatedData.company_name}` : ''}. ` +
      `Your personality should be ${personalityDescription}. ` +
      (validatedData.structured_questions?.length > 0 
        ? `\n\nIMPORTANT: During the conversation, naturally gather the following information:\n` +
          validatedData.structured_questions.map(q => 
            `- ${q.question} (${q.required ? 'Required' : 'Optional'})`
          ).join('\n') +
          `\n\nGather this information naturally during the conversation without sounding like an interview.`
        : '') +
      `\n\nAlways maintain a ${personalityDescription} tone throughout the conversation.`;

    console.log('[Assistant API] System prompt generated');

    // Step 8: Create assistant in VAPI (with error handling)
    if (process.env.VAPI_API_KEY) {
      try {
        console.log('[Assistant API] Creating assistant in VAPI...');
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
          clientMessages: validatedData.client_messages,
        });
        console.log('[Assistant API] VAPI assistant created successfully:', vapiAssistantId);
      } catch (vapiError) {
        console.error('[Assistant API] VAPI creation failed:', vapiError);
        // Generate a fallback ID so we can still save the assistant
        vapiAssistantId = `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        console.log('[Assistant API] Using fallback VAPI ID:', vapiAssistantId);
      }
    } else {
      // No VAPI key, use fallback
      vapiAssistantId = `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.log('[Assistant API] No VAPI API key, using fallback ID:', vapiAssistantId);
    }

    // Step 9: Build config object with all settings
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
      client_messages: validatedData.client_messages
    };

    // Step 10: Insert into database
    const insertData = {
      user_id: user.id,
      name: validatedData.name,
      template_id: validatedData.template_id || null,
      vapi_assistant_id: vapiAssistantId,
      config: config
    };
    
    console.log('[Assistant API] Inserting into database...');
    const { data: assistant, error: dbError } = await supabase
      .from('user_assistants')
      .insert(insertData)
      .select('*')
      .single();

    if (dbError) {
      console.error('[Assistant API] Database insert error:', dbError);
      
      // Check if it's a unique constraint error
      if (dbError.code === '23505' && dbError.message?.includes('vapi_assistant_id')) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'DUPLICATE_ERROR', 
            message: 'An assistant with this ID already exists. Please try again.' 
          }
        }, { status: 409 });
      }
      
      throw dbError;
    }
    
    if (!assistant) {
      throw new Error('Assistant creation returned no data');
    }
    
    assistantCreated = true;
    console.log('[Assistant API] Assistant created in database:', assistant.id);

    // Step 11: Save structured questions (if any)
    if (validatedData.structured_questions && validatedData.structured_questions.length > 0) {
      try {
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
          // Don't fail the whole operation for this
        } else {
          console.log('[Assistant API] Structured questions saved successfully');
        }
      } catch (questionsError) {
        console.error('[Assistant API] Failed to save structured questions:', questionsError);
        // Continue - assistant is already created
      }
    }

    // Step 12: Log audit event (non-blocking)
    try {
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
    } catch (auditError) {
      console.warn('[Assistant API] Failed to log audit event:', auditError);
      // Don't throw error as this is not critical
    }

    // Success response
    return NextResponse.json({
      success: true,
      data: assistant,
      message: 'Assistant created successfully',
      warnings: vapiAssistantId?.startsWith('fallback_') ? ['VAPI integration unavailable, using local mode'] : undefined
    }, { status: 201 });
    
  } catch (error) {
    console.error('[Assistant API] Unhandled error in POST:', error);
    console.error('[Assistant API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // If we created an assistant but something failed after, include the ID in the response
    if (assistantCreated) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARTIAL_SUCCESS',
          message: 'Assistant created but some features failed to initialize',
          assistantId: vapiAssistantId
        }
      }, { status: 207 }); // 207 Multi-Status
    }
    
    return handleAPIError(error);
  }
}