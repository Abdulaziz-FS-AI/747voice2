import { VapiError } from '@/lib/errors';
import crypto from 'crypto';

// VAPI API Types
interface VapiMessage {
  role: string;
  content: string;
}

interface VapiFunction {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

interface VapiModel {
  provider: string;
  model: string;
  messages?: VapiMessage[];
  functions?: VapiFunction[];
  maxTokens?: number;
  temperature?: number;
}

interface VapiVoice {
  provider: string;
  voiceId: string;
}

interface VapiTranscriber {
  provider: string;
  model?: string;
  language?: string;
}

// Vapi API configuration
const VAPI_BASE_URL = process.env.VAPI_BASE_URL || 'https://api.vapi.ai';
const VAPI_API_KEY = process.env.VAPI_API_KEY;

if (!VAPI_API_KEY) {
  console.warn('VAPI_API_KEY is not configured. Vapi features will be disabled.');
}

// Vapi API client
class VapiClient {
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey: string, baseURL: string = VAPI_BASE_URL) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey) {
      console.error('[VAPI] ❌ API key not configured');
      throw new VapiError('Vapi API key not configured', 500);
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      console.log(`[VAPI] 🚀 Making ${options.method || 'GET'} request to: ${endpoint}`);
      console.log(`[VAPI] 🚀 Full URL: ${url}`);
      console.log(`[VAPI] 🚀 Headers (auth redacted):`, {
        ...headers,
        'Authorization': 'Bearer [REDACTED]'
      });
      
      if (options.body) {
        console.log(`[VAPI] 🚀 Request body length:`, options.body.toString().length);
        // Log first 500 chars of body for debugging
        const bodyPreview = options.body.toString().substring(0, 500);
        console.log(`[VAPI] 🚀 Request body preview:`, bodyPreview + (options.body.toString().length > 500 ? '...' : ''));
      }
      
      // Create timeout with AbortController for compatibility
      const controller = new AbortController();
      // Reduce timeout for serverless functions (Vercel has 60s max)
      const timeoutMs = process.env.VERCEL ? 25000 : 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      console.log(`[VAPI] 📥 Response status: ${response.status} ${response.statusText}`);
      console.log(`[VAPI] 📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      let data;
      try {
        const responseText = await response.text();
        console.log(`[VAPI] 📥 Raw response text length:`, responseText.length);
        console.log(`[VAPI] 📥 Raw response preview:`, responseText.substring(0, 500));
        
        data = JSON.parse(responseText);
        console.log(`[VAPI] 📥 Parsed response data:`, data);
      } catch (jsonError) {
        console.error('[VAPI] ❌ Failed to parse response as JSON:', jsonError);
        data = { message: 'Invalid response format from VAPI' };
      }

      if (!response.ok) {
        console.error(`[VAPI] ❌ API error response: ${response.status}`, data);
        throw new VapiError(
          data.message || data.error?.message || `Vapi API error: ${response.status}`,
          response.status,
          data
        );
      }

      console.log(`[VAPI] ✅ Request successful`);
      return data;
    } catch (error) {
      if (error instanceof VapiError) {
        console.error('[VAPI] ❌ VapiError thrown:', error.message, error.statusCode);
        throw error;
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[VAPI] ❌ Request timed out');
        throw new VapiError('VAPI request timed out', 504);
      }
      
      console.error('[VAPI] ❌ Network error:', error);
      throw new VapiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  // Assistant management
  async createAssistant(assistantData: {
    name: string;
    systemPrompt?: string;
    firstMessage?: string;
    firstMessageMode?: 'assistant-speaks-first' | 'user-speaks-first';
    voice?: {
      provider: string;
      voiceId: string;
    };
    model?: {
      provider: string;
      model: string;
      messages?: Array<{
        role: string;
        content: string;
      }>;
      functions?: VapiFunction[];
      maxTokens?: number;
      temperature?: number;
    };
    transcriber?: {
      provider: string;
      model?: string;
    };
    maxDurationSeconds?: number;
    backgroundSound?: 'off' | 'office';
    analysisPlan?: any;
    server?: {
      url: string;
      secret?: string;
      headers?: Record<string, string>;
    };
    serverMessages?: string[];
    clientMessages?: string[];
    endCallMessage?: string;
    recordingEnabled?: boolean;
    fillersEnabled?: boolean;
    endCallFunctionEnabled?: boolean;
    dialKeypadFunctionEnabled?: boolean;
    silenceTimeoutSeconds?: number;
    responseDelaySeconds?: number;
    userId?: string;
    assistantId?: string;
  }) {
    const vapiAssistant = {
      name: assistantData.name,
      model: assistantData.model || {
        provider: 'openai',
        model: 'gpt-4.1-mini-2025-04-14',
        maxTokens: 500,
        temperature: 0.7,
      },
      voice: assistantData.voice || {
        provider: 'vapi',
        voiceId: 'Elliot',
      },
      transcriber: assistantData.transcriber || {
        provider: 'deepgram',
        model: 'nova-3-general',
        language: 'en',
      },
      ...(assistantData.firstMessage && {
        firstMessage: assistantData.firstMessage,
      }),
      ...(assistantData.firstMessageMode && {
        firstMessageMode: assistantData.firstMessageMode,
      }),
      ...(assistantData.maxDurationSeconds && {
        maxDurationSeconds: assistantData.maxDurationSeconds,
      }),
      ...(assistantData.backgroundSound && {
        backgroundSound: assistantData.backgroundSound,
      }),
      ...(assistantData.analysisPlan && {
        analysisPlan: assistantData.analysisPlan,
      }),
      ...(assistantData.server && {
        server: {
          url: assistantData.server.url,
          secret: assistantData.server.secret,
          ...(assistantData.server.headers && {
            headers: assistantData.server.headers
          })
        }
      }),
      ...(assistantData.serverMessages && {
        serverMessages: assistantData.serverMessages,
      }),
      ...(assistantData.clientMessages !== undefined && {
        clientMessages: assistantData.clientMessages,
      }),
      ...(assistantData.endCallMessage && {
        endCallMessage: assistantData.endCallMessage,
      }),
      recordingEnabled: assistantData.recordingEnabled !== false,
      fillersEnabled: assistantData.fillersEnabled !== false,
      endCallFunctionEnabled: assistantData.endCallFunctionEnabled || false,
      dialKeypadFunctionEnabled: assistantData.dialKeypadFunctionEnabled || false,
      ...(assistantData.silenceTimeoutSeconds && {
        silenceTimeoutSeconds: assistantData.silenceTimeoutSeconds,
      }),
      ...(assistantData.responseDelaySeconds && {
        responseDelaySeconds: assistantData.responseDelaySeconds,
      }),
    };

    return this.request('/assistant', {
      method: 'POST',
      body: JSON.stringify(vapiAssistant),
    });
  }

  async updateAssistant(assistantId: string, assistantData: Partial<{
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voice: {
      provider: string;
      voiceId: string;
    };
    model: {
      provider: string;
      model: string;
      maxTokens?: number;
      temperature?: number;
    };
  }>) {
    const updateData: Record<string, unknown> = {};

    if (assistantData.name) updateData.name = assistantData.name;
    if (assistantData.systemPrompt) updateData.systemMessage = assistantData.systemPrompt;
    if (assistantData.firstMessage) updateData.firstMessage = assistantData.firstMessage;
    if (assistantData.voice) updateData.voice = assistantData.voice;
    if (assistantData.model) updateData.model = assistantData.model;

    return this.request(`/assistant/${assistantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteAssistant(assistantId: string) {
    return this.request(`/assistant/${assistantId}`, {
      method: 'DELETE',
    });
  }

  async getAssistant(assistantId: string) {
    return this.request(`/assistant/${assistantId}`);
  }

  async listAssistants() {
    return this.request('/assistant');
  }

  // Phone number management
  async listPhoneNumbers() {
    return this.request('/phone-number');
  }

  async buyPhoneNumber(areaCode?: string) {
    const body: Record<string, string> = {};
    if (areaCode) body.areaCode = areaCode;

    return this.request('/phone-number/buy', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async deletePhoneNumber(phoneNumberId: string) {
    return this.request(`/phone-number/${phoneNumberId}`, {
      method: 'DELETE',
    });
  }

  // Call management
  async createCall(callData: {
    phoneNumberId?: string;
    assistantId: string;
    customer?: {
      number: string;
      name?: string;
    };
  }) {
    return this.request('/call', {
      method: 'POST',
      body: JSON.stringify(callData),
    });
  }

  async getCall(callId: string) {
    return this.request(`/call/${callId}`);
  }

  async listCalls(limit?: number, createdAtGt?: string, createdAtLt?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (createdAtGt) params.append('createdAtGt', createdAtGt);
    if (createdAtLt) params.append('createdAtLt', createdAtLt);

    const query = params.toString();
    return this.request(`/call${query ? `?${query}` : ''}`);
  }

  // Webhook verification
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret) {
      console.warn('Webhook secret not configured');
      return true; // Allow in development
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}

// Create default client instance
export const vapiClient = VAPI_API_KEY ? new VapiClient(VAPI_API_KEY) : null;

// Utility functions
export async function createVapiAssistant(assistantData: {
  name: string;
  modelId?: string;
  systemPrompt?: string;
  firstMessage?: string;
  firstMessageMode?: 'assistant-speaks-first' | 'user-speaks-first';
  voiceId?: string;
  maxDurationSeconds?: number;
  backgroundSound?: 'off' | 'office';
  structuredQuestions?: Array<{
    id: string;
    question: string;
    structuredName: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
  }>;
  evaluationRubric?: string | null;
  functions?: VapiFunction[];
  clientMessages?: string[];
}): Promise<string> {
  if (!vapiClient) {
    console.warn('Vapi client not configured, generating fallback ID');
    throw new Error('VAPI client not configured');
  }

  try {
    // Map custom model IDs to VAPI-compatible models
    const modelMapping: Record<string, string> = {
      'gpt-4.1-nano-2025-04-14': 'gpt-4o-mini',  // Cheapest
      'gpt-4o-mini-cluster-2025-04-14': 'gpt-4o-mini',  // Fastest
      'gpt-4.1-2025-04-14': 'gpt-4o',  // 4.1
      'gpt-4o-cluster-2025-04-14': 'gpt-4o',  // 4o
      'gpt-4.1-mini-2025-04-14': 'gpt-4o-mini'  // Default
    };

    const vapiModel = modelMapping[assistantData.modelId || ''] || 'gpt-4o-mini';

    // Prepare model configuration with functions
    const modelConfig: VapiModel = {
      provider: 'openai',
      model: vapiModel,
      messages: [
        {
          role: 'system',
          content: assistantData.systemPrompt || 'You are a helpful assistant.',
        }
      ],
      ...(assistantData.functions && assistantData.functions.length > 0 && {
        functions: assistantData.functions
      }),
      maxTokens: 500,
      temperature: 0.7,
    };

    // Voice configuration - VAPI voices
    const voiceConfig: VapiVoice = {
      provider: 'vapi',
      voiceId: assistantData.voiceId || 'Elliot',
    };

    // Transcriber configuration - Fixed to Deepgram Nova 3 General
    const transcriberConfig: VapiTranscriber = {
      provider: 'deepgram',
      model: 'nova-3-general',
      language: 'en',
    };

    // Create analysis plan for structured data and evaluation
    const analysisPlan: any = {
      minMessagesThreshold: 2,
      summaryPlan: {
        enabled: true,
        timeoutSeconds: 30
      }
    };

    // Add structured data plan if questions exist
    if (assistantData.structuredQuestions && assistantData.structuredQuestions.length > 0) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      assistantData.structuredQuestions.forEach(question => {
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

    // Add evaluation plan if rubric is selected
    if (assistantData.evaluationRubric) {
      analysisPlan.successEvaluationPlan = {
        rubric: assistantData.evaluationRubric,
        enabled: true,
        timeoutSeconds: 30
      };
    }

    // Create server configuration - simplified for reliability
    let serverConfig = null;
    let serverMessages: string[] = [];
    
    // Only add server config if webhook URL is properly configured
    if (process.env.MAKE_WEBHOOK_URL && process.env.MAKE_WEBHOOK_URL.startsWith('https://')) {
      const webhookSecret = process.env.MAKE_WEBHOOK_SECRET || '';
      serverConfig = {
        url: process.env.MAKE_WEBHOOK_URL,
        ...(webhookSecret && { secret: webhookSecret })
      };
      
      // Only add server messages if we have server config
      serverMessages = ['end-of-call-report'];
      console.log('[VAPI] Using webhook configuration:', process.env.MAKE_WEBHOOK_URL);
    } else {
      console.log('[VAPI] No webhook configuration - creating assistant without server integration');
    }

    console.log('[VAPI] Creating assistant with config:', {
      name: assistantData.name,
      modelProvider: modelConfig.provider,
      model: modelConfig.model,
      voice: voiceConfig.voiceId,
      firstMessageMode: assistantData.firstMessageMode,
      backgroundSound: assistantData.backgroundSound,
      hasStructuredQuestions: !!analysisPlan.structuredDataPlan,
      hasEvaluation: !!analysisPlan.successEvaluationPlan,
      serverUrl: serverConfig?.url || 'None',
      hasServerSecret: !!(serverConfig?.secret),
      webhookUrl: process.env.MAKE_WEBHOOK_URL
    });

    // Build the assistant payload
    const assistantPayload: any = {
      name: assistantData.name,
      model: modelConfig,
      voice: voiceConfig,
      transcriber: transcriberConfig,
      firstMessage: assistantData.firstMessage || 'Hello! How can I help you today?',
      firstMessageMode: assistantData.firstMessageMode || 'assistant-speaks-first',
      maxDurationSeconds: assistantData.maxDurationSeconds || 300,
      backgroundSound: assistantData.backgroundSound || 'office',
      analysisPlan: analysisPlan,
      clientMessages: assistantData.clientMessages || [],
      endCallMessage: "Thank you for calling! Have a great day!",
      recordingEnabled: true,
      fillersEnabled: true,
      endCallFunctionEnabled: false,
      dialKeypadFunctionEnabled: false,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4,
    };

    // Only add server config if it exists
    if (serverConfig) {
      assistantPayload.server = serverConfig;
      assistantPayload.serverMessages = serverMessages;
    }

    console.log('[VAPI] Full assistant payload being sent:', {
      ...assistantPayload,
      server: serverConfig ? { ...serverConfig, secret: serverConfig.secret ? '[REDACTED]' : undefined } : null
    });

    const result = await vapiClient.createAssistant(assistantPayload);

    if (!result || !result.id) {
      throw new Error('VAPI returned invalid response - no assistant ID');
    }

    console.log('[VAPI] Assistant created successfully with ID:', result.id);
    return result.id;
  } catch (error) {
    console.error('[VAPI] Failed to create assistant:', error);
    
    // Log more detailed error information
    if (error instanceof VapiError) {
      console.error('[VAPI] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        details: error.details
      });
    }
    
    throw error;
  }
}

export async function updateVapiAssistant(
  vapiAssistantId: string,
  assistantData: Partial<{
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId: string;
  }>
) {
  if (!vapiClient) {
    console.warn('Vapi client not configured, skipping assistant update');
    return;
  }

  try {
    const updateData: Record<string, unknown> = {};

    if (assistantData.name) updateData.name = assistantData.name;
    if (assistantData.systemPrompt) updateData.systemPrompt = assistantData.systemPrompt;
    if (assistantData.firstMessage) updateData.firstMessage = assistantData.firstMessage;
    
    if (assistantData.voiceId) {
      updateData.voice = {
        provider: 'vapi',
        voiceId: assistantData.voiceId,
      };
    }

    await vapiClient.updateAssistant(vapiAssistantId, updateData);
  } catch (error) {
    console.error('Failed to update Vapi assistant:', error);
    throw error;
  }
}

export async function deleteVapiAssistant(vapiAssistantId: string) {
  if (!vapiClient) {
    console.warn('Vapi client not configured, skipping assistant deletion');
    return;
  }

  try {
    await vapiClient.deleteAssistant(vapiAssistantId);
  } catch (error) {
    console.error('Failed to delete Vapi assistant:', error);
    // Don't throw error for deletion as the local record should still be deleted
  }
}

// Helper functions
function getVoiceConfigForPersonality(
  personality: 'professional' | 'friendly' | 'casual',
  voiceId?: string,
  language: string = 'en-US'
) {
  if (voiceId) {
    return {
      provider: 'azure',
      voiceId: voiceId,
    };
  }

  // Default voice mapping based on personality and language
  const voiceMap = {
    'en-US': {
      professional: 'en-US-JennyNeural',
      friendly: 'en-US-AriaNeural',
      casual: 'en-US-GuyNeural',
    },
    'es-ES': {
      professional: 'es-ES-ElviraNeural',
      friendly: 'es-ES-AlvaroNeural',
      casual: 'es-ES-AbrilNeural',
    },
  };

  const languageVoices = voiceMap[language as keyof typeof voiceMap] || voiceMap['en-US'];
  
  return {
    provider: 'azure',
    voiceId: languageVoices[personality],
  };
}

function getModelConfigForPersonality(personality: 'professional' | 'friendly' | 'casual') {
  const baseConfig = {
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 250,
  };

  switch (personality) {
    case 'professional':
      return { ...baseConfig, temperature: 0.3 };
    case 'friendly':
      return { ...baseConfig, temperature: 0.7 };
    case 'casual':
      return { ...baseConfig, temperature: 0.8 };
    default:
      return { ...baseConfig, temperature: 0.7 };
  }
}

export { VapiClient };