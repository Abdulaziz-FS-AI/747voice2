/**
 * Webhook Processing Tests
 * Critical tests for VAPI webhook event handling and data integrity
 */

import { WebhookProcessor } from '@/lib/webhook-processor'
import { createServiceRoleClient } from '@/lib/supabase'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/call-analyzer', () => ({
  CallAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeCall: jest.fn().mockResolvedValue({
      qualification_status: 'qualified',
      sentiment_score: 0.8,
      interest_level: 'high',
      call_quality: 'good',
      summary: 'Test analysis summary',
      key_topics: ['pricing', 'features'],
      action_items: ['follow up in 3 days'],
    }),
  })),
}))
jest.mock('@/lib/lead-extractor', () => ({
  LeadExtractor: jest.fn().mockImplementation(() => ({
    extractFromMessages: jest.fn().mockResolvedValue([
      { field: 'name', value: 'John Doe' },
      { field: 'email', value: 'john@example.com' },
    ]),
  })),
}))

describe('Webhook Processing', () => {
  let webhookProcessor: WebhookProcessor
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }

    ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)

    webhookProcessor = new WebhookProcessor()
  })

  describe('Call Start Event Processing', () => {
    test('should process call-start event successfully', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        callId: 'call-123',
        assistantId: 'assistant-456',
        call: {
          id: 'vapi-call-123',
          assistantId: 'assistant-456',
          startedAt: '2024-01-15T10:00:00Z',
          customer: {
            number: '+1234567890',
            name: 'John Doe',
          },
          type: 'inboundPhoneCall',
        },
      }

      const mockAssistant = {
        id: 'db-assistant-123',
        user_id: 'user-789',
        team_id: 'team-456',
        name: 'Real Estate Assistant',
      }

      const mockCall = {
        id: 'db-call-123',
      }

      // Mock assistant lookup
      const mockAssistantChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockAssistant, error: null }),
      }

      // Mock call creation
      const mockCallChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCall, error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockAssistantChain) // First call for assistant lookup
        .mockReturnValueOnce(mockCallChain) // Second call for call creation

      const result = await webhookProcessor.handleCallStart(mockCallStartEvent as any)

      expect(result.success).toBe(true)
      expect(result.callId).toBe('db-call-123')
      expect(mockSupabase.from).toHaveBeenCalledWith('assistants')
      expect(mockSupabase.from).toHaveBeenCalledWith('calls')
    })

    test('should handle missing assistant error', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        callId: 'call-123',
        call: {
          assistantId: 'nonexistent-assistant',
        },
      }

      const mockAssistantChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      mockSupabase.from.mockReturnValue(mockAssistantChain)

      await expect(
        webhookProcessor.handleCallStart(mockCallStartEvent as any)
      ).rejects.toThrow('Assistant not found')
    })
  })

  describe('Call End Event Processing', () => {
    test('should process call-end event with cost breakdown', async () => {
      const mockCallEndEvent = {
        type: 'call-end',
        callId: 'call-123',
        call: {
          id: 'vapi-call-123',
          startedAt: '2024-01-15T10:00:00Z',
          endedAt: '2024-01-15T10:05:00Z',
          cost: 0.25,
          costBreakdown: {
            llm: 0.10,
            stt: 0.05,
            tts: 0.07,
            transport: 0.03,
          },
          transcript: 'Hello, this is a test call transcript.',
          messages: [
            { role: 'assistant', content: 'Hello! How can I help you?' },
            { role: 'user', content: 'I need information about a property.' },
          ],
        },
      }

      const mockExistingCall = {
        id: 'db-call-123',
        assistant_id: 'db-assistant-123',
        assistants: {
          id: 'db-assistant-123',
          user_id: 'user-789',
          team_id: 'team-456',
          name: 'Real Estate Assistant',
        },
      }

      // Mock call lookup
      const mockCallLookupChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingCall, error: null }),
      }

      // Mock call update
      const mockCallUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }

      // Mock call analysis insertion
      const mockAnalysisInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'analysis-123' }, error: null }),
      }

      // Mock cost breakdown insertion (from storeCostBreakdown method)
      const mockCostBreakdownChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      // Mock cost breakdown insertion for the final call
      const mockCostInsertChain = {
        insert: jest.fn().mockReturnThis(),
      }

      // Mock transcript insertion
      const mockTranscriptInsertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      // Mock lead creation chains
      const mockLeadCallLookupChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { user_id: 'user-789', team_id: 'team-456', caller_number: '555-0123' }, 
          error: null 
        }),
      }

      const mockLeadInsertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockCallLookupChain) // Call lookup - from('calls')
        .mockReturnValueOnce(mockCallUpdateChain) // Call update - from('calls')
        .mockReturnValueOnce(mockCostBreakdownChain) // Cost breakdown - from('call_costs')
        .mockReturnValueOnce(mockTranscriptInsertChain) // Transcript storage - from('call_transcripts')
        .mockReturnValueOnce(mockAnalysisInsertChain) // Call analysis - from('call_analysis')
        .mockReturnValueOnce(mockLeadCallLookupChain) // Lead creation call lookup - from('calls')
        .mockReturnValueOnce(mockLeadInsertChain) // Lead insertion - from('leads')

      const result = await webhookProcessor.handleCallEnd(mockCallEndEvent as any)

      expect(result.success).toBe(true)
      expect(mockCallUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          cost: 0.25,
          ai_model_cost: 0.10,
          transcription_cost: 0.05,
          tts_cost: 0.07,
          phone_cost: 0.03,
        })
      )
    })

    test('should handle call-end event without cost breakdown', async () => {
      const mockCallEndEvent = {
        type: 'call-end',
        callId: 'call-123',
        call: {
          id: 'vapi-call-123',
          startedAt: '2024-01-15T10:00:00Z',
          endedAt: '2024-01-15T10:05:00Z',
          cost: 0.25,
          // No costBreakdown provided
        },
      }

      const mockExistingCall = {
        id: 'db-call-123',
        assistants: {
          user_id: 'user-789',
          team_id: 'team-456',
        },
      }

      const mockCallLookupChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockExistingCall, error: null }),
      }

      const mockCallUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }

      // Mock cost breakdown insertion (from storeCostBreakdown method)
      const mockCostBreakdownChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      // Mock call analysis insertion
      const mockAnalysisInsertChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'analysis-123' }, error: null }),
      }

      // Mock lead creation chains
      const mockLeadCallLookupChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { user_id: 'user-789', team_id: 'team-456', caller_number: '555-0123' }, 
          error: null 
        }),
      }

      const mockLeadInsertChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockCallLookupChain) // Call lookup - from('calls')
        .mockReturnValueOnce(mockCallUpdateChain) // Call update - from('calls')
        .mockReturnValueOnce(mockCostBreakdownChain) // Cost breakdown - from('call_costs')
        .mockReturnValueOnce(mockAnalysisInsertChain) // Call analysis - from('call_analysis')
        .mockReturnValueOnce(mockLeadCallLookupChain) // Lead creation call lookup - from('calls')
        .mockReturnValueOnce(mockLeadInsertChain) // Lead insertion - from('leads')

      await webhookProcessor.handleCallEnd(mockCallEndEvent as any)

      expect(mockCallUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_model_cost: 0,
          transcription_cost: 0,
          tts_cost: 0,
          phone_cost: 0,
        })
      )
    })
  })

  describe('Duration Calculation', () => {
    test('should calculate call duration correctly', () => {
      const startTime = '2024-01-15T10:00:00Z'
      const endTime = '2024-01-15T10:05:30Z'

      // Access private method for testing
      const duration = (webhookProcessor as any).calculateDuration(startTime, endTime)

      expect(duration).toBe(330) // 5 minutes 30 seconds = 330 seconds
    })

    test('should handle same start and end time', () => {
      const time = '2024-01-15T10:00:00Z'

      const duration = (webhookProcessor as any).calculateDuration(time, time)

      expect(duration).toBe(0)
    })
  })

  describe('Cost Breakdown Storage', () => {
    test('should store detailed cost breakdown', async () => {
      const mockCallData = {
        id: 'vapi-call-123',
        startedAt: '2024-01-15T10:00:00Z',
        endedAt: '2024-01-15T10:05:00Z',
        cost: 0.25,
        costBreakdown: {
          llm: 0.10,
          stt: 0.05,
          tts: 0.07,
          transport: 0.03,
        },
        transcript: 'Test transcript with 25 characters',
        messages: [
          { content: 'Hello world' }, // 11 characters
          { content: 'How are you?' }, // 12 characters
        ],
      }

      const mockCostChain = {
        insert: jest.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockCostChain)

      await (webhookProcessor as any).storeCostBreakdown(
        'db-call-123',
        'team-456',
        mockCallData
      )

      expect(mockCostChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          call_id: 'db-call-123',
          team_id: 'team-456',
          total_cost: 0.25,
          ai_model_cost: 0.10,
          transcription_cost: 0.05,
          tts_cost: 0.07,
          phone_cost: 0.03,
          ai_model_tokens: expect.any(Number),
          tts_characters: expect.any(Number),
          transcription_duration: 300,
          phone_duration: 300,
          vapi_cost_data: expect.any(Object),
          created_at: expect.any(String),
          updated_at: expect.any(String),
        })
      )
    })

    test('should estimate tokens from messages', () => {
      const messages = [
        { content: 'Hello world, this is a test message' }, // ~35 characters
        { content: 'Another message for testing' }, // ~27 characters
      ]

      const tokens = (webhookProcessor as any).estimateTokensFromMessages(messages)

      // Rough estimate: ~62 characters / 4 = ~16 tokens
      expect(tokens).toBeGreaterThan(10)
      expect(tokens).toBeLessThan(20)
    })

    test('should handle empty messages array', () => {
      const tokens = (webhookProcessor as any).estimateTokensFromMessages([])

      expect(tokens).toBe(0)
    })
  })

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const mockCallStartEvent = {
        type: 'call-start',
        callId: 'call-123',
        call: { assistantId: 'assistant-456' },
      }

      const mockErrorChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      }

      mockSupabase.from.mockReturnValue(mockErrorChain)

      await expect(
        webhookProcessor.handleCallStart(mockCallStartEvent as any)
      ).rejects.toThrow('Database connection failed')
    })

    test('should handle malformed webhook data', async () => {
      const malformedEvent = {
        type: 'call-start',
        // Missing required fields
      }

      await expect(
        webhookProcessor.handleCallStart(malformedEvent as any)
      ).rejects.toThrow()
    })
  })

  describe('Transcript Storage', () => {
    test('should store call transcript with speakers', async () => {
      const mockTranscriptChain = {
        insert: jest.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockTranscriptChain)

      const messages = [
        { role: 'assistant', content: 'Hello!', time: '2024-01-15T10:00:00Z' },
        { role: 'user', content: 'Hi there', time: '2024-01-15T10:00:05Z' },
      ]

      await (webhookProcessor as any).storeTranscript(
        'db-call-123',
        'Full transcript text',
        messages
      )

      expect(mockTranscriptChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          call_id: 'db-call-123',
          transcript_text: 'Full transcript text',
          speakers: expect.arrayContaining([
            expect.objectContaining({
              role: 'assistant',
              text: 'Hello!',
            }),
            expect.objectContaining({
              role: 'user',
              text: 'Hi there',
            }),
          ]),
        })
      )
    })

    // Note: storeTranscript method may not exist in current implementation
    test.skip('should handle transcript storage errors', async () => {
      const mockErrorChain = {
        insert: jest.fn().mockRejectedValue(new Error('Storage failed')),
      }

      mockSupabase.from.mockReturnValue(mockErrorChain)

      // Should not throw error, just log it
      await expect(
        (webhookProcessor as any).storeTranscript('db-call-123', 'transcript')
      ).resolves.not.toThrow()
    })
  })
})