/**
 * VAPI Resource Event Types
 * Handles assistant and phone number lifecycle events
 */

import { z } from 'zod'

// Base resource event schema
export const baseResourceEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  resourceType: z.enum(['assistant', 'phoneNumber']),
  resourceId: z.string(),
  orgId: z.string(),
  action: z.enum(['created', 'updated', 'deleted']),
})

// Assistant events
export const assistantCreatedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('assistant.created'),
  resourceType: z.literal('assistant'),
  action: z.literal('created'),
  assistant: z.object({
    id: z.string(),
    name: z.string(),
    model: z.any(),
    voice: z.any(),
    firstMessage: z.string().optional(),
    context: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
})

export const assistantUpdatedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('assistant.updated'),
  resourceType: z.literal('assistant'),
  action: z.literal('updated'),
  assistant: z.object({
    id: z.string(),
    name: z.string(),
    model: z.any(),
    voice: z.any(),
    firstMessage: z.string().optional(),
    context: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  changes: z.record(z.any()).optional(),
})

export const assistantDeletedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('assistant.deleted'),
  resourceType: z.literal('assistant'),
  action: z.literal('deleted'),
  assistantId: z.string(),
})

// Phone number events
export const phoneNumberCreatedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('phoneNumber.created'),
  resourceType: z.literal('phoneNumber'),
  action: z.literal('created'),
  phoneNumber: z.object({
    id: z.string(),
    number: z.string(),
    name: z.string().optional(),
    assistantId: z.string().optional(),
    twilioAccountSid: z.string().optional(),
    twilioPhoneNumberSid: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
})

export const phoneNumberUpdatedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('phoneNumber.updated'),
  resourceType: z.literal('phoneNumber'),
  action: z.literal('updated'),
  phoneNumber: z.object({
    id: z.string(),
    number: z.string(),
    name: z.string().optional(),
    assistantId: z.string().optional(),
    twilioAccountSid: z.string().optional(),
    twilioPhoneNumberSid: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  changes: z.record(z.any()).optional(),
})

export const phoneNumberDeletedEventSchema = baseResourceEventSchema.extend({
  type: z.literal('phoneNumber.deleted'),
  resourceType: z.literal('phoneNumber'),
  action: z.literal('deleted'),
  phoneNumberId: z.string(),
})

// Unified resource event schema
export const resourceEventSchema = z.discriminatedUnion('type', [
  assistantCreatedEventSchema,
  assistantUpdatedEventSchema,
  assistantDeletedEventSchema,
  phoneNumberCreatedEventSchema,
  phoneNumberUpdatedEventSchema,
  phoneNumberDeletedEventSchema,
])

// Type exports
export type ResourceEvent = z.infer<typeof resourceEventSchema>
export type AssistantCreatedEvent = z.infer<typeof assistantCreatedEventSchema>
export type AssistantUpdatedEvent = z.infer<typeof assistantUpdatedEventSchema>
export type AssistantDeletedEvent = z.infer<typeof assistantDeletedEventSchema>
export type PhoneNumberCreatedEvent = z.infer<typeof phoneNumberCreatedEventSchema>
export type PhoneNumberUpdatedEvent = z.infer<typeof phoneNumberUpdatedEventSchema>
export type PhoneNumberDeletedEvent = z.infer<typeof phoneNumberDeletedEventSchema>

// Type guards
export function isAssistantDeletedEvent(event: ResourceEvent): event is AssistantDeletedEvent {
  return event.type === 'assistant.deleted'
}

export function isPhoneNumberDeletedEvent(event: ResourceEvent): event is PhoneNumberDeletedEvent {
  return event.type === 'phoneNumber.deleted'
}

export function isResourceDeletionEvent(event: ResourceEvent): event is AssistantDeletedEvent | PhoneNumberDeletedEvent {
  return event.action === 'deleted'
}

// Validation
export function validateResourceEvent(payload: unknown): ResourceEvent | null {
  try {
    return resourceEventSchema.parse(payload)
  } catch (error) {
    console.error('Resource event validation error:', error)
    return null
  }
}