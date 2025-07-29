/**
 * Vapi Webhook Event Types and Schemas
 * Complete type definitions for all Vapi webhook events
 */

import { z } from 'zod'

// =============================================
// BASE WEBHOOK SCHEMA
// =============================================
export const baseWebhookSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  callId: z.string().optional(),
  orgId: z.string(),
  assistantId: z.string().optional(),
  phoneNumberId: z.string().optional(),
  customerId: z.string().optional(),
})

// =============================================
// CALL EVENT SCHEMAS
// =============================================
export const callStartEventSchema = baseWebhookSchema.extend({
  type: z.literal('call-start'),
  callId: z.string(),
  assistantId: z.string(),
  customer: z.object({
    number: z.string(),
    name: z.string().optional(),
  }).optional(),
  call: z.object({
    id: z.string(),
    orgId: z.string(),
    type: z.enum(['inboundPhoneCall', 'outboundPhoneCall', 'webCall']),
    assistantId: z.string(),
    status: z.enum(['queued', 'ringing', 'in-progress', 'forwarding', 'ended']),
    phoneNumberId: z.string().optional(),
    customerId: z.string().optional(),
    startedAt: z.string(),
    endedAt: z.string().optional(),
    cost: z.number().optional(),
    costBreakdown: z.object({
      transport: z.number().optional(),
      stt: z.number().optional(),
      llm: z.number().optional(),
      tts: z.number().optional(),
      vapi: z.number().optional(),
      total: z.number().optional(),
    }).optional(),
  }),
})

export const callEndEventSchema = baseWebhookSchema.extend({
  type: z.literal('call-end'),
  callId: z.string(),
  call: z.object({
    id: z.string(),
    orgId: z.string(),
    type: z.enum(['inboundPhoneCall', 'outboundPhoneCall', 'webCall']),
    assistantId: z.string(),
    status: z.literal('ended'),
    phoneNumberId: z.string().optional(),
    customerId: z.string().optional(),
    startedAt: z.string(),
    endedAt: z.string(),
    cost: z.number(),
    costBreakdown: z.object({
      transport: z.number().optional(),
      stt: z.number().optional(),
      llm: z.number().optional(),
      tts: z.number().optional(),
      vapi: z.number().optional(),
      total: z.number(),
    }),
    messages: z.array(z.any()).optional(),
    recordingUrl: z.string().optional(),
    stereoRecordingUrl: z.string().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    analysis: z.object({
      summary: z.string().optional(),
      structuredData: z.record(z.string(), z.any()).optional(),
      successEvaluation: z.string().optional(),
    }).optional(),
  }),
})

// =============================================
// FUNCTION CALL EVENT SCHEMA
// =============================================
export const functionCallEventSchema = baseWebhookSchema.extend({
  type: z.literal('function-call'),
  callId: z.string(),
  assistantId: z.string(),
  functionCall: z.object({
    name: z.string(),
    parameters: z.record(z.string(), z.any()),
    result: z.any().optional(),
  }),
  message: z.object({
    type: z.enum(['function-call', 'function-result']),
    functionCall: z.object({
      name: z.string(),
      parameters: z.record(z.string(), z.any()),
    }).optional(),
    result: z.any().optional(),
    time: z.number(),
    secondsFromStart: z.number(),
  }),
})

// =============================================
// TRANSCRIPT EVENT SCHEMA
// =============================================
export const transcriptEventSchema = baseWebhookSchema.extend({
  type: z.literal('transcript'),
  callId: z.string(),
  transcript: z.object({
    type: z.enum(['partial', 'final']),
    text: z.string(),
    user: z.enum(['assistant', 'user']),
    timestamp: z.string(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
  }),
})

// =============================================
// HANG EVENT SCHEMA
// =============================================
export const hangEventSchema = baseWebhookSchema.extend({
  type: z.literal('hang'),
  callId: z.string(),
  reason: z.string().optional(),
})

// =============================================
// SPEECH UPDATE EVENT SCHEMA
// =============================================
export const speechUpdateEventSchema = baseWebhookSchema.extend({
  type: z.literal('speech-update'),
  callId: z.string(),
  status: z.enum(['started', 'stopped']),
  role: z.enum(['assistant', 'user']),
})

// =============================================
// STATUS UPDATE EVENT SCHEMA
// =============================================
export const statusUpdateEventSchema = baseWebhookSchema.extend({
  type: z.literal('status-update'),
  callId: z.string(),
  status: z.enum(['queued', 'ringing', 'in-progress', 'forwarding', 'ended']),
  messages: z.array(z.any()).optional(),
})

// =============================================
// VOICE INPUT EVENT SCHEMA
// =============================================
export const voiceInputEventSchema = baseWebhookSchema.extend({
  type: z.literal('voice-input'),
  callId: z.string(),
  input: z.object({
    type: z.literal('voice'),
    text: z.string(),
    isFinal: z.boolean(),
    timestamp: z.string(),
  }),
})

// =============================================
// UNIFIED WEBHOOK EVENT SCHEMA
// =============================================
export const webhookEventSchema = z.discriminatedUnion('type', [
  callStartEventSchema,
  callEndEventSchema,
  functionCallEventSchema,
  transcriptEventSchema,
  hangEventSchema,
  speechUpdateEventSchema,
  statusUpdateEventSchema,
  voiceInputEventSchema,
])

// =============================================
// TYPE EXPORTS
// =============================================
export type WebhookEvent = z.infer<typeof webhookEventSchema>
export type CallStartEvent = z.infer<typeof callStartEventSchema>
export type CallEndEvent = z.infer<typeof callEndEventSchema>
export type FunctionCallEvent = z.infer<typeof functionCallEventSchema>
export type TranscriptEvent = z.infer<typeof transcriptEventSchema>
export type HangEvent = z.infer<typeof hangEventSchema>
export type SpeechUpdateEvent = z.infer<typeof speechUpdateEventSchema>
export type StatusUpdateEvent = z.infer<typeof statusUpdateEventSchema>
export type VoiceInputEvent = z.infer<typeof voiceInputEventSchema>

// =============================================
// PROCESSING RESULT TYPES
// =============================================
export interface WebhookProcessingResult {
  success: boolean
  eventId: string
  callId?: string
  error?: string
  processedAt: string
  data?: any
}

export interface LeadExtractionResult {
  responses: Array<{
    questionText: string
    answerValue: string
    fieldName: string
    confidence: number
    collectedAt: string
  }>
  totalQuestions: number
  answeredQuestions: number
  completionRate: number
}

export interface CallAnalysisResult {
  leadScore: number
  qualificationStatus: 'qualified' | 'unqualified' | 'needs_followup' | 'hot_lead'
  leadQuality: 'hot' | 'warm' | 'cold' | 'unqualified'
  sentiment: {
    score: number // -1 to 1
    label: 'positive' | 'negative' | 'neutral'
    emotionalTone: string
  }
  intent: {
    primary: string
    secondary: string[]
    confidence: number
  }
  topics: {
    keyTopics: string[]
    objections: string[]
    painPoints: string[]
    interests: string[]
  }
  engagement: {
    score: number // 0-100
    talkTimePercentage: number
    questionsAnswered: number
    totalQuestions: number
  }
  summary: string
  nextSteps: string
  confidence: number
}

// =============================================
// EVENT HANDLER TYPES
// =============================================
export type WebhookEventHandler<T extends WebhookEvent = WebhookEvent> = (
  event: T,
  context: {
    callId: string
    assistantId?: string
    userId?: string
  }
) => Promise<WebhookProcessingResult>

export interface WebhookHandlers {
  'call-start': WebhookEventHandler<CallStartEvent>
  'call-end': WebhookEventHandler<CallEndEvent>
  'function-call': WebhookEventHandler<FunctionCallEvent>
  'transcript': WebhookEventHandler<TranscriptEvent>
  'hang': WebhookEventHandler<HangEvent>
  'speech-update': WebhookEventHandler<SpeechUpdateEvent>
  'status-update': WebhookEventHandler<StatusUpdateEvent>
  'voice-input': WebhookEventHandler<VoiceInputEvent>
}

// =============================================
// VALIDATION UTILITIES
// =============================================
export function validateWebhookEvent(payload: unknown): WebhookEvent | null {
  try {
    return webhookEventSchema.parse(payload)
  } catch (error) {
    console.error('Webhook validation error:', error)
    return null
  }
}

export function isCallEndEvent(event: WebhookEvent): event is CallEndEvent {
  return event.type === 'call-end'
}

export function isFunctionCallEvent(event: WebhookEvent): event is FunctionCallEvent {
  return event.type === 'function-call'
}

export function isTranscriptEvent(event: WebhookEvent): event is TranscriptEvent {
  return event.type === 'transcript'
}

export function isCallStartEvent(event: WebhookEvent): event is CallStartEvent {
  return event.type === 'call-start'
}

// =============================================
// ERROR TYPES
// =============================================
export class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public eventType: string,
    public callId?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'WebhookProcessingError'
  }
}