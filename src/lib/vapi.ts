import { VapiError } from '@/lib/errors';

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
      functions?: any[];
      maxTokens?: number;
      temperature?: number;
    };
    transcriber?: {
      provider: string;
      model?: string;
    };
    maxDurationSeconds?: number;
    serverUrl?: string;
    serverUrlSecret?: string;
    endCallMessage?: string;
    recordingEnabled?: boolean;
    fillersEnabled?: boolean;
    endCallFunctionEnabled?: boolean;
    dialKeypadFunctionEnabled?: boolean;
    silenceTimeoutSeconds?: number;
    responseDelaySeconds?: number;
  }) {
    const vapiAssistant = {
      name: assistantData.name,
      model: assistantData.model || {
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 250,
        temperature: 0.7,
      },
      voice: assistantData.voice || {
        provider: 'elevenlabs',
        voiceId: 'voice_professional_female_en',
      },
      transcriber: assistantData.transcriber || {
        provider: 'deepgram',
        model: 'nova-2',
      },
      ...(assistantData.firstMessage && {
        firstMessage: assistantData.firstMessage,
      }),
      ...(assistantData.maxDurationSeconds && {
        maxDurationSeconds: assistantData.maxDurationSeconds,
      }),
      ...(assistantData.serverUrl && {
        serverUrl: assistantData.serverUrl,
        serverUrlSecret: assistantData.serverUrlSecret || '',
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
    const updateData: any = {};

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
    const body: any = {};
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
      const crypto = require('crypto');
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
  systemPrompt?: string;
  firstMessage?: string;
  voiceId?: string;
  language?: string;
  maxDurationSeconds?: number;
  functions?: any[];
}) {
  if (!vapiClient) {
    console.warn('Vapi client not configured, skipping assistant creation');
    return null;
  }

  try {
    // Prepare model configuration with functions
    const modelConfig = {
      provider: 'openai',
      model: 'gpt-4',
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

    // Voice configuration
    const voiceConfig = {
      provider: '11labs',
      voiceId: assistantData.voiceId || 'pNInz6obpgDQGcFmaJgB',
    };

    const result = await vapiClient.createAssistant({
      name: assistantData.name,
      model: modelConfig,
      voice: voiceConfig,
      firstMessage: assistantData.firstMessage,
      maxDurationSeconds: assistantData.maxDurationSeconds || 300,
      serverUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/vapi`,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || '',
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
    language: string;
  }>
) {
  if (!vapiClient) {
    console.warn('Vapi client not configured, skipping assistant update');
    return;
  }

  try {
    const updateData: any = {};

    if (assistantData.name) updateData.name = assistantData.name;
    if (assistantData.systemPrompt) updateData.systemPrompt = assistantData.systemPrompt;
    if (assistantData.firstMessage) updateData.firstMessage = assistantData.firstMessage;
    
    if (assistantData.voiceId || assistantData.language) {
      updateData.voice = {
        provider: 'azure',
        voiceId: assistantData.voiceId || 'en-US-JennyNeural',
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