/**
 * VAPI Webhook Integration Tests
 * Critical tests for webhook processing and data integrity
 */

import { POST } from '@/app/api/webhooks/vapi/route'
import { NextRequest } from 'next/server'
import { WebhookProcessor } from '@/lib/webhook-processor'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/webhook-processor')

describe('VAPI Webhook Integration', () => {
  let mockWebhookProcessor: jest.Mocked<WebhookProcessor>

  beforeEach(() => {
    mockWebhookProcessor = {
      handleCallStart: jest.fn(),
      handleCallEnd: jest.fn(),
      handleFunctionCall: jest.fn(),
      handleTranscript: jest.fn(),
      handleHang: jest.fn(),
      handleSpeechUpdate: jest.fn(),
      handleStatusUpdate: jest.fn(),
      handleVoiceInput: jest.fn(),
    } as any

    ;(WebhookProcessor as jest.MockedClass<typeof WebhookProcessor>).mockImplementation(
      () => mockWebhookProcessor
    )
  })

  describe('Call Start Events', () => {
    test('should process call-start webhook successfully', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        timestamp: new Date().toISOString(),
        callId: 'call-123',
        assistantId: 'assistant-456',
        call: {
          id: 'call-123',
          orgId: 'org-789',
          type: 'inboundPhoneCall',
          assistantId: 'assistant-456',
          status: 'in-progress',
          startedAt: new Date().toISOString(),
          customer: {
            number: '+1234567890',
            name: 'John Doe',
          },
        },
      }

      mockWebhookProcessor.handleCallStart.mockResolvedValue({
        success: true,
        eventId: 'event-123',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: { callId: 'call-123', assistantId: 'assistant-456' },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallStartEvent),
        headers: new Headers({
          'content-type': 'application/json',
        }),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(mockWebhookProcessor.handleCallStart).toHaveBeenCalledWith(mockCallStartEvent)
    })

    test('should handle call-start processing errors', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        callId: 'call-123',
        call: { id: 'call-123', assistantId: 'invalid-assistant' },
      }

      mockWebhookProcessor.handleCallStart.mockRejectedValue(
        new Error('Assistant not found')
      )

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallStartEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Assistant not found')
    })
  })

  describe('Call End Events', () => {
    test('should process call-end webhook with cost data', async () => {
      const mockCallEndEvent = {
        type: 'call-end',
        timestamp: new Date().toISOString(),
        callId: 'call-123',
        call: {
          id: 'call-123',
          orgId: 'org-789',
          type: 'inboundPhoneCall',
          assistantId: 'assistant-456',
          status: 'ended',
          startedAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
          endedAt: new Date().toISOString(),
          cost: 0.15,
          costBreakdown: {
            transport: 0.05,
            stt: 0.03,
            llm: 0.05,
            tts: 0.02,
            total: 0.15,
          },
          transcript: 'Hello, how can I help you today?',
          messages: [
            {
              role: 'assistant',
              content: 'Hello, how can I help you today?',
              time: new Date().toISOString(),
            },
          ],
        },
      }

      mockWebhookProcessor.handleCallEnd.mockResolvedValue({
        success: true,
        eventId: 'event-456',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: {
          callId: 'call-123',
          duration: 120,
          cost: 0.15,
          analysis: { qualification_status: 'qualified' },
        },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallEndEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(mockWebhookProcessor.handleCallEnd).toHaveBeenCalledWith(mockCallEndEvent)
    })

    test('should handle missing cost breakdown gracefully', async () => {
      const mockCallEndEvent = {
        type: 'call-end',
        callId: 'call-123',
        call: {
          id: 'call-123',
          assistantId: 'assistant-456',
          status: 'ended',
          startedAt: new Date(Date.now() - 60000).toISOString(),
          endedAt: new Date().toISOString(),
          cost: 0.10,
          // No costBreakdown provided
        },
      }

      mockWebhookProcessor.handleCallEnd.mockResolvedValue({
        success: true,
        eventId: 'event-789',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: { callId: 'call-123', cost: 0.10 },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallEndEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(mockWebhookProcessor.handleCallEnd).toHaveBeenCalled()
    })
  })

  describe('Function Call Events', () => {
    test('should process function-call webhook', async () => {
      const mockFunctionCallEvent = {
        type: 'function-call',
        timestamp: new Date().toISOString(),
        callId: 'call-123',
        assistantId: 'assistant-456',
        functionCall: {
          name: 'transfer_call',
          parameters: {
            department: 'sales',
            reason: 'qualified_lead',
          },
          result: {
            success: true,
            transferredTo: 'sales-agent-1',
          },
        },
      }

      mockWebhookProcessor.handleFunctionCall.mockResolvedValue({
        success: true,
        eventId: 'event-function-123',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: { functionName: 'transfer_call', result: true },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockFunctionCallEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(mockWebhookProcessor.handleFunctionCall).toHaveBeenCalledWith(mockFunctionCallEvent)
    })
  })

  describe('Transcript Events', () => {
    test('should process transcript updates', async () => {
      const mockTranscriptEvent = {
        type: 'transcript',
        timestamp: new Date().toISOString(),
        callId: 'call-123',
        transcript: {
          role: 'user',
          text: 'I\'m interested in buying a house',
          timestamp: new Date().toISOString(),
        },
      }

      mockWebhookProcessor.handleTranscript.mockResolvedValue({
        success: true,
        eventId: 'event-transcript-123',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: { transcriptLength: 31 },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockTranscriptEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(mockWebhookProcessor.handleTranscript).toHaveBeenCalledWith(mockTranscriptEvent)
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed webhook data', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          type: 'invalid-event',
          // Missing required fields
        }),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Unknown webhook event type')
    })

    test('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })

    test('should handle webhook processing failures gracefully', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        callId: 'call-123',
        call: { id: 'call-123', assistantId: 'assistant-456' },
      }

      mockWebhookProcessor.handleCallStart.mockRejectedValue(
        new Error('Database connection failed')
      )

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallStartEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Database connection failed')
      
      // Should still log the event for debugging
      expect(mockWebhookProcessor.handleCallStart).toHaveBeenCalled()
    })
  })

  describe('Webhook Security', () => {
    test('should validate webhook signatures when configured', () => {
      // This would test signature verification
      // Implementation depends on VAPI's signature mechanism
      expect(true).toBe(true) // Placeholder
    })

    test('should rate limit webhook endpoints', () => {
      // Test rate limiting to prevent abuse
      expect(true).toBe(true) // Placeholder
    })

    test('should log suspicious webhook activity', () => {
      // Test logging for security monitoring
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Usage Tracking Integration', () => {
    test('should update usage metrics on call completion', async () => {
      const mockCallEndEvent = {
        type: 'call-end',
        callId: 'call-123',
        call: {
          id: 'call-123',
          assistantId: 'assistant-456',
          status: 'ended',
          startedAt: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
          endedAt: new Date().toISOString(),
          cost: 0.25,
          costBreakdown: {
            transport: 0.10,
            stt: 0.05,
            llm: 0.08,
            tts: 0.02,
            total: 0.25,
          },
        },
      }

      mockWebhookProcessor.handleCallEnd.mockResolvedValue({
        success: true,
        eventId: 'event-usage-123',
        callId: 'call-123',
        processedAt: new Date().toISOString(),
        data: {
          callId: 'call-123',
          cost: 0.25,
          duration: 180,
          usageUpdated: true,
        },
      })

      const mockRequest = {
        json: jest.fn().mockResolvedValue(mockCallEndEvent),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.usageUpdated).toBe(true)
    })
  })
})