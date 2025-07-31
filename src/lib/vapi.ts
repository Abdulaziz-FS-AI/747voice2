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
      throw new VapiError('Vapi API key not configured', 500);
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new VapiError(
          data.message || `Vapi API error: ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof VapiError) {
        throw error;
      }
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
        provider: 'assembly-ai',
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
}) {
  if (!vapiClient) {
    console.warn('Vapi client not configured, skipping assistant creation');
    return null;
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

    // Transcriber configuration
    const transcriberConfig: VapiTranscriber = {
      provider: 'assembly-ai',
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

    // Create server configuration with proper headers (new VAPI format)
    const serverConfig = {
      url: process.env.MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/m3olq7ealo40xevpjdar7573j2cst9uk',
      secret: process.env.MAKE_WEBHOOK_SECRET || 'k8sP2hGfD8jL5vZbN4pRqWcVfHjG5dEmP7sTzXyA1bC3eF6gHjKl',
      headers: {
        'X-API-Key': process.env.MAKE_WEBHOOK_SECRET || 'k8sP2hGfD8jL5vZbN4pRqWcVfHjG5dEmP7sTzXyA1bC3eF6gHjKl',
        'X-Webhook-Source': 'voice-matrix',
        'X-Assistant-Name': assistantData.name,
        'X-User-ID': '{{userId}}',           // VAPI template variables
        'X-Assistant-ID': '{{assistantId}}', // VAPI template variables  
        'X-Call-ID': '{{callId}}',          // VAPI template variables
        'X-Phone-Number': '{{phoneNumber}}', // VAPI template variables
        'X-Timestamp': '{{timestamp}}'       // VAPI template variables
      }
    };

    // Enhanced server messages for comprehensive webhook coverage
    const serverMessages = [
      'conversation-update',      // Real-time conversation updates
      'function-call',           // Function calls (requires response)
      'end-of-call-report',      // Call analytics and summary  
      'tool-calls',              // Tool invocations (requires response)
      'transfer-destination-request', // Call transfers (requires response)
      'status-update',           // Call status changes
      'user-interrupted',        // When user interrupts assistant
      'speech-update',           // Speech recognition updates
      'hang'                     // When call is hung up
    ];

    const result = await vapiClient.createAssistant({
      name: assistantData.name,
      model: modelConfig,
      voice: voiceConfig,
      transcriber: transcriberConfig,
      firstMessage: assistantData.firstMessage || 'Hello! How can I help you today?',
      firstMessageMode: assistantData.firstMessageMode || 'assistant-speaks-first',
      maxDurationSeconds: assistantData.maxDurationSeconds || 300,
      backgroundSound: assistantData.backgroundSound || 'office',
      analysisPlan: analysisPlan,
      // Use new VAPI server format with headers
      server: serverConfig,
      serverMessages: serverMessages,
      endCallMessage: "Thank you for calling! Have a great day!",
      recordingEnabled: true,
      fillersEnabled: true,
      endCallFunctionEnabled: false,
      dialKeypadFunctionEnabled: false,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4,
    });

    return result.id;
  } catch (error) {
    console.error('Failed to create Vapi assistant:', error);
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