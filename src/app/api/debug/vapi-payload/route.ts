import { NextRequest, NextResponse } from 'next/server';
import { requireAuth as authenticateRequest } from '@/lib/auth-simple';
import { z } from 'zod';

// Copy the same schema from the main assistant route
const StructuredQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  structuredName: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  description: z.string(),
  required: z.boolean()
});

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
  template_id: z.string().uuid().optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEBUG VAPI PAYLOAD ROUTE ===');
    
    // Authenticate
    const authResult = await authenticateRequest();
    const user = authResult.user;
    
    // Parse and validate request
    const body = await request.json();
    const validatedData = CreateAssistantSchema.parse(body);
    
    // Build the exact same system prompt as the main route
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

    // Build the exact model mapping
    const modelMapping: Record<string, string> = {
      'gpt-4.1-nano-2025-04-14': 'gpt-4o-mini',
      'gpt-4o-mini-cluster-2025-04-14': 'gpt-4o-mini',
      'gpt-4.1-2025-04-14': 'gpt-4o',
      'gpt-4o-cluster-2025-04-14': 'gpt-4o',
      'gpt-4.1-mini-2025-04-14': 'gpt-4o-mini'
    };

    const vapiModel = modelMapping[validatedData.model_id || ''] || 'gpt-4o-mini';

    // Build model config
    const modelConfig = {
      provider: 'openai',
      model: vapiModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        }
      ],
      maxTokens: 500,
      temperature: 0.7,
    };

    // Voice config
    const voiceConfig = {
      provider: 'vapi',
      voiceId: validatedData.voice_id || 'Elliot',
    };

    // Transcriber config
    const transcriberConfig = {
      provider: 'deepgram',
      model: 'nova-3-general',
      language: 'en',
    };

    // Analysis plan
    const analysisPlan: any = {
      minMessagesThreshold: 2,
      summaryPlan: {
        enabled: true,
        timeoutSeconds: 30
      }
    };

    // Add structured data if questions exist
    if (validatedData.structured_questions && validatedData.structured_questions.length > 0) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      validatedData.structured_questions.forEach(question => {
        properties[question.structuredName] = {
          type: question.type,
          description: question.description
        };

        if (question.required) {
          required.push(question.structuredName);
        }
      });

      analysisPlan.structuredDataPlan = {
        enabled: true,
        schema: {
          type: 'object',
          properties,
          required,
          description: 'Structured data extracted from the conversation'
        },
        timeoutSeconds: 30
      };
    }

    // Add evaluation plan
    if (validatedData.evaluation_rubric) {
      analysisPlan.successEvaluationPlan = {
        rubric: validatedData.evaluation_rubric,
        enabled: true,
        timeoutSeconds: 30
      };
    }

    // Server config
    let serverConfig = null;
    if (process.env.MAKE_WEBHOOK_URL && process.env.MAKE_WEBHOOK_URL.startsWith('https://')) {
      const webhookSecret = process.env.MAKE_WEBHOOK_SECRET || '';
      serverConfig = {
        url: process.env.MAKE_WEBHOOK_URL,
        ...(webhookSecret && { secret: webhookSecret }),
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret && { 'x-make-apikey': webhookSecret })
        }
      };
    }

    // Build the final payload that would be sent to VAPI
    const finalPayload: any = {
      name: validatedData.name,
      model: modelConfig,
      voice: voiceConfig,
      transcriber: transcriberConfig,
      firstMessage: validatedData.first_message || 'Hello! How can I help you today?',
      firstMessageMode: validatedData.first_message_mode || 'assistant-speaks-first',
      maxDurationSeconds: validatedData.max_call_duration || 300,
      backgroundSound: validatedData.background_sound || 'office',
      analysisPlan: analysisPlan,
      clientMessages: ['transcript'],
      endCallMessage: "Thank you for calling! Have a great day!",
      recordingEnabled: true,
      fillersEnabled: true,
      endCallFunctionEnabled: false,
      dialKeypadFunctionEnabled: false,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4,
    };

    if (serverConfig) {
      finalPayload.server = serverConfig;
      finalPayload.serverMessages = ['end-of-call-report'];
    }

    return NextResponse.json({
      success: true,
      debug: {
        message: 'This is exactly what would be sent to VAPI',
        url: 'https://api.vapi.ai/assistant',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer [YOUR_VAPI_API_KEY]',
          'Content-Type': 'application/json'
        },
        environmentCheck: {
          VAPI_API_KEY: !!process.env.VAPI_API_KEY,
          VAPI_API_KEY_LENGTH: process.env.VAPI_API_KEY?.length || 0,
          VAPI_API_KEY_PREFIX: process.env.VAPI_API_KEY?.substring(0, 8) + '...',
          MAKE_WEBHOOK_URL: process.env.MAKE_WEBHOOK_URL,
          MAKE_WEBHOOK_SECRET: !!process.env.MAKE_WEBHOOK_SECRET
        },
        payload: finalPayload,
        payloadSizeBytes: JSON.stringify(finalPayload).length
      }
    });

  } catch (error) {
    console.error('Debug route error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        details: error
      }
    }, { status: 400 });
  }
}