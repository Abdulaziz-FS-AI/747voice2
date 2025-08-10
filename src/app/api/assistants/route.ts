import { NextRequest, NextResponse } from 'next/server';
import { requireAuth as authenticateRequest } from '@/lib/auth-simple';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { createVapiAssistant } from '@/lib/vapi';
import { z } from 'zod';
import { DEMO_LIMITS } from '@/types/database';

// Structured question schema
const StructuredQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  structuredName: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
  required: z.boolean()
});

// DEMO SYSTEM: Simplified validation schema (no templates)
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
  ]).optional().nullable()
  // REMOVED: template_id - single default template
});

// GET /api/assistants - Get all ACTIVE assistants for the user
export async function GET(request: NextRequest) {
  let user: any = null;
  try {
    const authResult = await authenticateRequest();
    user = authResult.user;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search');

    const supabase = createServiceRoleClient('get_assistants');

    let query = supabase
      .from('user_assistants')
      .select('*', { count: 'exact' });

    // DEMO SYSTEM: Only return active assistants
    query = query.eq('user_id', user.id).eq('assistant_state', 'active');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

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

// POST /api/assistants - Create a new assistant (DEMO SYSTEM)
export async function POST(request: NextRequest) {
  let vapiAssistantId: string | null = null;
  let assistantCreated = false;
  const operationId = `assistant_create_${Date.now()}`
  let user: any = null;
  
  try {
    console.log('🎯 [DEMO API] ===== STARTING DEMO ASSISTANT CREATION =====');
    
    // Authentication
    const authResult = await authenticateRequest();
    user = authResult.user;
    console.log('[DEMO API] User authenticated:', user.id);

    // Environment check
    const requiredEnvVars = {
      VAPI_API_KEY: process.env.VAPI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    
    if (missingEnvVars.length > 0) {
      console.error('[DEMO API] Missing environment variables:', missingEnvVars);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'CONFIGURATION_ERROR', 
          message: `Server configuration incomplete: ${missingEnvVars.join(', ')}`
        }
      }, { status: 500 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateAssistantSchema.parse(body);
    console.log('[DEMO API] Request validated successfully');

    // DEMO SYSTEM: Ensure user profile exists with demo limits
    const supabase = createServiceRoleClient('demo_assistant_creation');
    
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      console.log('[DEMO API] Creating demo user profile');
      
      // Now create the profile (user already exists in auth.users from auth-simple.ts)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || 'demo@example.com',
          full_name: user.user_metadata?.full_name || 'Demo User',
          max_assistants: DEMO_LIMITS.MAX_ASSISTANTS,
          max_minutes_total: DEMO_LIMITS.MAX_MINUTES_TOTAL,
          current_usage_minutes: 0
        });
      
      if (profileError) {
        console.error('[DEMO API] Failed to create demo profile:', {
          error: profileError,
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          userId: user.id,
          userEmail: user.email
        });
        throw new Error(`Failed to initialize demo user profile: ${profileError.message || 'Unknown error'}`);
      }
      
      console.log('[DEMO API] Successfully created demo profile');
    }

    // DEMO SYSTEM: Check assistant creation limits (3 max)
    const { count: currentCount } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('assistant_state', 'active');
    
    console.log(`[DEMO API] User has ${currentCount} active assistants`);
    
    if (currentCount >= DEMO_LIMITS.MAX_ASSISTANTS) {
      console.log('[DEMO API] Assistant limit reached');
      return NextResponse.json({
        success: false,
        error: {
          code: 'DEMO_LIMIT_REACHED',
          message: `Demo limit: Maximum ${DEMO_LIMITS.MAX_ASSISTANTS} assistants allowed`,
          details: {
            current: currentCount,
            limit: DEMO_LIMITS.MAX_ASSISTANTS,
            suggestion: 'This is a demo account with limited assistants'
          }
        }
      }, { status: 200 });
    }

    // DEMO SYSTEM: Check if user has reached usage limit
    const userProfile = existingProfile || await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => data);

    if (userProfile && userProfile.current_usage_minutes >= DEMO_LIMITS.MAX_MINUTES_TOTAL) {
      console.log('[DEMO API] Usage limit exceeded');
      return NextResponse.json({
        success: false,
        error: {
          code: 'DEMO_USAGE_LIMIT_EXCEEDED',
          message: `Demo limit: ${DEMO_LIMITS.MAX_MINUTES_TOTAL} minutes total usage exceeded`,
          details: {
            currentUsage: userProfile.current_usage_minutes,
            limit: DEMO_LIMITS.MAX_MINUTES_TOTAL,
            suggestion: 'This is a demo account with limited usage'
          }
        }
      }, { status: 200 });
    }

    // Build system prompt (NO TEMPLATE DEPENDENCY)
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
          `\n\nGather this information naturally during conversation without sounding like an interview.`
        : '') +
      `\n\nAlways maintain a ${personalityDescription} tone throughout the conversation.`;

    console.log('[DEMO API] System prompt built, length:', systemPrompt.length);

    // Create assistant in VAPI
    console.log('[DEMO API] Creating assistant in VAPI...');
    
    vapiAssistantId = await createVapiAssistant({
      name: validatedData.name,
      modelId: validatedData.model_id,
      systemPrompt: systemPrompt,
      firstMessage: validatedData.first_message,
      firstMessageMode: validatedData.first_message_mode,
      voiceId: validatedData.voice_id,
      maxDurationSeconds: validatedData.max_call_duration,
      backgroundSound: validatedData.background_sound,
      structuredQuestions: validatedData.structured_questions,
      evaluationRubric: validatedData.evaluation_rubric
    });
    
    console.log('[DEMO API] ✅ VAPI assistant created:', vapiAssistantId);

    // DEMO SYSTEM: Build config object with expiration
    const config = {
      personality: validatedData.personality,
      personality_traits: validatedData.personality_traits,
      company_name: validatedData.company_name,
      model_id: validatedData.model_id,
      system_prompt: systemPrompt,
      first_message: validatedData.first_message,
      first_message_mode: validatedData.first_message_mode,
      voice_id: validatedData.voice_id,
      max_call_duration: validatedData.max_call_duration,
      background_sound: validatedData.background_sound,
      structured_questions: validatedData.structured_questions,
      evaluation_rubric: validatedData.evaluation_rubric,
      demo_system: true
    };

    // DEMO SYSTEM: Insert into database with auto-expiration
    const insertData = {
      user_id: user.id,
      name: validatedData.name,
      personality: validatedData.personality,
      template_id: null, // NO TEMPLATE SYSTEM
      vapi_assistant_id: vapiAssistantId,
      config: config,
      usage_minutes: 0,
      max_lifetime_days: DEMO_LIMITS.MAX_LIFETIME_DAYS,
      expires_at: new Date(Date.now() + (DEMO_LIMITS.MAX_LIFETIME_DAYS * 24 * 60 * 60 * 1000)).toISOString(),
      will_auto_delete: true,
      assistant_state: 'active'
    };
    
    console.log('[DEMO API] Inserting demo assistant into database...');
    const { data: assistant, error: dbError } = await supabase
      .from('user_assistants')
      .insert(insertData)
      .select('*')
      .single();

    if (dbError) {
      console.error('[DEMO API] Database insert error:', dbError);
      throw dbError;
    }
    
    assistantCreated = true;
    console.log('[DEMO API] ✅ Demo assistant created in database:', assistant.id);
    
    // Save structured questions (if any)
    if (validatedData.structured_questions && validatedData.structured_questions.length > 0) {
      const questionsToInsert = validatedData.structured_questions.map((q, index) => ({
        assistant_id: assistant.id,
        form_title: 'Demo Assistant Questions',
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
        console.error('[DEMO API] Error saving structured questions:', questionsError);
      } else {
        console.log('[DEMO API] Structured questions saved successfully');
      }
    }

    console.log('🎯 [DEMO API] ===== DEMO ASSISTANT CREATION SUCCESSFUL =====');

    // DEMO SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      data: assistant,
      message: `Demo assistant created! Expires in ${DEMO_LIMITS.MAX_LIFETIME_DAYS} days or when ${DEMO_LIMITS.MAX_MINUTES_TOTAL} minutes used.`,
      demoInfo: {
        remainingAssistants: DEMO_LIMITS.MAX_ASSISTANTS - (currentCount + 1),
        remainingMinutes: DEMO_LIMITS.MAX_MINUTES_TOTAL - (userProfile?.current_usage_minutes || 0),
        expiresAt: assistant.expires_at,
        daysRemaining: DEMO_LIMITS.MAX_LIFETIME_DAYS
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ [DEMO API] ===== DEMO ASSISTANT CREATION FAILED =====');
    console.error('❌ [DEMO API] Error:', error);
    
    if (assistantCreated) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PARTIAL_SUCCESS',
          message: 'Assistant created but some features failed to initialize',
          assistantId: vapiAssistantId
        }
      }, { status: 207 });
    }
    
    return handleAPIError(error);
  }
}