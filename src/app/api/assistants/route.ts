import { NextRequest, NextResponse } from 'next/server';
import { requireAuth as authenticateRequest, testAuthSystem } from '@/lib/auth-ultimate';
import { requirePermission, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';
import { UsageService } from '@/lib/services/usage.service';
import { rateLimitAPI, rateLimitAssistant } from '@/lib/middleware/rate-limiting';
// import { ErrorTracker, PerformanceTracker, BusinessMetrics } from '@/lib/monitoring/sentry';

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
  // client_messages removed - handled by backend with fixed values
  template_id: z.string().uuid().optional().nullable()
});

// GET /api/assistants - Get all assistants for the user
export async function GET(request: NextRequest) {
  let user: any = null;
  try {
    // Apply rate limiting first
    const rateLimitResponse = await rateLimitAPI(request)
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await authenticateRequest();
    user = authResult.user;
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
    console.error('GET assistants failed:', error)
    return handleAPIError(error);
  }
}

// POST /api/assistants - Create a new assistant
export async function POST(request: NextRequest) {
  let vapiAssistantId: string | null = null;
  let assistantCreated = false;
  const operationId = `assistant_create_${Date.now()}`
  let user: any = null;
  
  try {
    console.log('🚀 [API] ===== STARTING ASSISTANT CREATION =====');
    console.log('Starting assistant creation transaction:', operationId)
    
    // Step 2: Ultimate authentication with multiple fallback strategies
    try {
      const authResult = await authenticateRequest();
      user = authResult.user;
      console.log('[Assistant API] User authenticated via ultimate auth:', user.id);
    } catch (authError) {
      console.error('[Assistant API] Ultimate authentication failed:', authError);
      
      // Enhanced error response with debugging info
      const errorDetails = authError instanceof Error ? {
        message: authError.message,
        code: (authError as any).code || 'AUTH_ERROR',
        details: (authError as any).details
      } : { message: 'Unknown authentication error', code: 'AUTH_ERROR' };
      
      return NextResponse.json({
        success: false,
        error: { 
          ...errorDetails,
          message: 'Authentication failed. Please try logging in again.',
          debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        }
      }, { status: 401 });
    }

    // Apply rate limiting for assistant creation (more restrictive)
    const rateLimitResponse = await rateLimitAssistant(request, user.id)
    if (rateLimitResponse) {
      console.log('🚫 [API] Rate limit exceeded for assistant creation')
      return rateLimitResponse
    }
    console.log('🚀 [API] Request method:', request.method);
    console.log('🚀 [API] Request URL:', request.url);
    console.log('🚀 [API] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Step 1: Validate environment configuration
    const requiredEnvVars = {
      VAPI_API_KEY: process.env.VAPI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    console.log('🚀 [API] Environment check:', {
      VAPI_API_KEY: !!process.env.VAPI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    });
    
    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    
    if (missingEnvVars.length > 0) {
      console.error('🚀 [API] Missing environment variables:', missingEnvVars);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: `Server configuration is incomplete. Missing: ${missingEnvVars.join(', ')}`,
          details: { 
            missing: missingEnvVars,
            environment: process.env.NODE_ENV,
            platform: process.env.VERCEL ? 'Vercel' : 'Local'
          }
        }
      }, { status: 500 });
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
      console.log('[Assistant API] Raw body data:', JSON.stringify(body, null, 2));
      validatedData = CreateAssistantSchema.parse(body);
      console.log('[Assistant API] Data validated successfully');
      console.log('[Assistant API] Validated personality:', validatedData.personality);
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
    const supabase = createServiceRoleClient('user_profile_creation');
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (!existingProfile) {
        console.log('[Assistant API] Creating missing user profile');
        
        // Try using the database function first
        const { error: functionError } = await supabase.rpc('ensure_user_profile', {
          user_uuid: user.id,
          user_email: user.email || 'unknown@example.com',
          user_name: user.user_metadata?.full_name || null
        });
        
        if (functionError) {
          console.error('[Assistant API] Function profile creation failed:', functionError);
          
          // Fallback to direct insert
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || 'unknown@example.com',
              full_name: user.user_metadata?.full_name || 'Unknown User',
              subscription_type: 'free',
              subscription_status: 'active',
              current_usage_minutes: 0,
              max_minutes_monthly: 10,
              max_assistants: 3,
              onboarding_completed: false
            });
          
          if (profileError) {
            console.error('[Assistant API] Fallback profile creation failed:', profileError);
            // Continue anyway - UsageService will handle this
          }
        }
      }
    } catch (profileError) {
      console.warn('[Assistant API] Profile check failed, continuing:', profileError);
    }
    
    // Step 6: Check assistant creation limits (3 max)
    const supabaseForCount = createServiceRoleClient('assistant_count');
    const { count: currentCount } = await supabaseForCount
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('assistant_state', 'deleted');
    
    console.log(`[Assistant API] User has ${currentCount} assistants`);
    
    if (currentCount >= 3) {
      console.log('[Assistant API] Assistant limit reached');
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_LIMIT_REACHED',
          message: 'You have reached the maximum of 3 assistants',
          details: {
            current: currentCount,
            limit: 3,
            suggestion: 'Delete an existing assistant to create a new one'
          }
        }
      }, { status: 200 }); // 200 OK - soft limit, not an error
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
        ? `\n\nIMPORTANT: At the beginning of the conversation, or when appropriate, naturally gather the following information:\n` +
          validatedData.structured_questions.map(q => 
            `- ${q.question} (${q.required ? 'Required' : 'Optional'})`
          ).join('\n') +
          `\n\nYou can start by asking if there's anything specific they need help with, then gather this information naturally without sounding like an interview.`
        : '') +
      `\n\nAlways maintain a ${personalityDescription} tone throughout the conversation.`;

    console.log('[Assistant API] System prompt generated, length:', systemPrompt.length);

    // Step 8: Create assistant in VAPI (with error handling)
    console.log('[Assistant API] VAPI_API_KEY present:', !!process.env.VAPI_API_KEY);
    console.log('[Assistant API] VAPI_API_KEY length:', process.env.VAPI_API_KEY?.length || 0);
    
    if (process.env.VAPI_API_KEY) {
      try {
        console.log('[Assistant API] Creating assistant in VAPI...');
        // Validate required fields before sending to VAPI
        if (!validatedData.name || validatedData.name.trim().length === 0) {
          throw new Error('Assistant name is required and cannot be empty');
        }
        
        if (!firstMessage || firstMessage.trim().length === 0) {
          throw new Error('First message is required and cannot be empty');
        }
        
        console.log('[Assistant API] VAPI payload preview:', {
          name: validatedData.name,
          modelId: validatedData.model_id,
          hasSystemPrompt: !!systemPrompt,
          systemPromptLength: systemPrompt?.length || 0,
          firstMessage: firstMessage,
          firstMessageMode: validatedData.first_message_mode,
          voiceId: validatedData.voice_id,
          maxDurationSeconds: validatedData.max_call_duration,
          backgroundSound: validatedData.background_sound,
          hasStructuredQuestions: !!validatedData.structured_questions?.length,
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
          // clientMessages handled by backend with fixed values
        });
        console.log('[Assistant API] ✅ Voice service assistant created successfully:', vapiAssistantId);
      } catch (vapiError) {
        console.error('[Assistant API] ❌ Voice service creation failed with detailed error:');
        console.error('[Assistant API] Error type:', typeof vapiError);
        console.error('[Assistant API] Error name:', vapiError instanceof Error ? vapiError.name : 'Unknown');
        console.error('[Assistant API] Error message:', vapiError instanceof Error ? vapiError.message : String(vapiError));
        console.error('[Assistant API] Error stack:', vapiError instanceof Error ? vapiError.stack : 'No stack');
        
        // Check if it's a VapiError with additional details
        if (vapiError && typeof vapiError === 'object' && 'statusCode' in vapiError) {
          console.error('[Assistant API] Voice service status code:', (vapiError as any).statusCode);
          console.error('[Assistant API] Voice service details:', (vapiError as any).details);
        }
        
        // Don't use fallback - throw the error so we can fix it
        throw new Error(`Voice service integration failed: ${vapiError instanceof Error ? vapiError.message : String(vapiError)}`);
      }
    } else {
      console.error('[Assistant API] ❌ No voice service API key configured!');
      throw new Error('Voice service API key is not configured. Assistant creation requires voice service integration.');
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
      // client_messages: Fixed backend values - transcript (client), end-of-call-report (server)
    };

    // Step 10: Insert into database
    const insertData = {
      user_id: user.id,
      name: validatedData.name,
      personality: validatedData.personality || 'professional', // Required by NOT NULL constraint, with fallback
      template_id: validatedData.template_id || null,
      vapi_assistant_id: vapiAssistantId,
      config: config
    };
    
    console.log('[Assistant API] Insert data personality:', insertData.personality);
    
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
    
    // Track business metrics
    console.log('Assistant created for user:', user.id, 'assistant:', assistant.id)

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

    // Track successful completion
    console.log('Assistant creation transaction completed successfully for user:', user.id)

    // Success response
    return NextResponse.json({
      success: true,
      data: assistant,
      message: 'Assistant created successfully',
      warnings: vapiAssistantId?.startsWith('fallback_') ? ['VAPI integration unavailable, using local mode'] : undefined
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ [API] ===== UNHANDLED ERROR IN ASSISTANT CREATION =====');
    console.error('❌ [API] Error type:', typeof error);
    console.error('❌ [API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('❌ [API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ [API] Assistant created?', assistantCreated);
    console.error('❌ [API] VAPI Assistant ID:', vapiAssistantId);
    
    // Track performance failure
    const userId = user?.id || 'unknown'
    console.log('Assistant creation transaction failed for user:', userId)
    
    // Capture error with context
    console.error('Assistant creation failed:', error)
    
    // If we created an assistant but something failed after, include the ID in the response
    if (assistantCreated) {
      console.log('⚠️  [API] Returning partial success response');
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARTIAL_SUCCESS',
          message: 'Assistant created but some features failed to initialize',
          assistantId: vapiAssistantId
        }
      }, { status: 207 }); // 207 Multi-Status
    }
    
    console.log('❌ [API] Calling handleAPIError with:', error);
    return handleAPIError(error);
  }
}