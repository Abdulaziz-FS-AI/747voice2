/**
 * VAPI Integration Tests
 * Critical tests for external voice assistant API integration
 */

import { VapiClient, createVapiAssistant, updateVapiAssistant, deleteVapiAssistant } from '@/lib/vapi'
import { VapiError } from '@/lib/errors'

// Mock fetch globally
global.fetch = jest.fn()

describe('VAPI Integration', () => {
  let vapiClient: VapiClient
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.VAPI_API_KEY = 'test-vapi-key'
    process.env.VAPI_BASE_URL = 'https://api.vapi.ai'
    
    vapiClient = new VapiClient('test-vapi-key')
  })

  describe('VapiClient Authentication', () => {
    test('should throw error when API key is missing during request', async () => {
      const client = new VapiClient('')
      await expect(client.createAssistant({ name: 'Test' })).rejects.toThrow('Vapi API key not configured')
    })

    test('should include authorization header in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test-assistant' }),
      } as Response)

      await vapiClient.createAssistant({
        name: 'Test Assistant',
        systemPrompt: 'You are a helpful assistant',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })
  })

  describe('Assistant Management', () => {
    test('should create assistant with valid configuration', async () => {
      const mockAssistant = {
        id: 'assistant-123',
        name: 'Test Assistant',
        model: {
          provider: 'openai',
          model: 'gpt-4',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssistant,
      } as Response)

      const result = await vapiClient.createAssistant({
        name: 'Test Assistant',
        systemPrompt: 'You are a helpful real estate assistant',
        firstMessage: 'Hello! How can I help you today?',
        voice: {
          provider: 'elevenlabs',
          voiceId: 'voice_professional_female_en',
        },
      })

      expect(result).toEqual(mockAssistant)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Test Assistant"'),
        })
      )
    })

    test('should handle API errors during assistant creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid assistant configuration' }),
      } as Response)

      await expect(
        vapiClient.createAssistant({
          name: 'Invalid Assistant',
        })
      ).rejects.toThrow(VapiError)
    })

    test('should update assistant with partial data', async () => {
      const mockUpdatedAssistant = {
        id: 'assistant-123',
        name: 'Updated Assistant',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedAssistant,
      } as Response)

      const result = await vapiClient.updateAssistant('assistant-123', {
        name: 'Updated Assistant',
        systemPrompt: 'Updated system prompt',
      })

      expect(result).toEqual(mockUpdatedAssistant)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant/assistant-123',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    test('should list all assistants', async () => {
      const mockAssistants = [
        { id: 'assistant-1', name: 'Assistant 1' },
        { id: 'assistant-2', name: 'Assistant 2' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAssistants,
      } as Response)

      const result = await vapiClient.listAssistants()

      expect(result).toEqual(mockAssistants)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    test('should delete assistant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await vapiClient.deleteAssistant('assistant-123')

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant/assistant-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Phone Number Management', () => {
    test('should list phone numbers', async () => {
      const mockPhoneNumbers = [
        { id: 'phone-1', number: '+1234567890' },
        { id: 'phone-2', number: '+1987654321' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumbers,
      } as Response)

      const result = await vapiClient.listPhoneNumbers()

      expect(result).toEqual(mockPhoneNumbers)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/phone-number',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    test('should buy phone number with area code', async () => {
      const mockPhoneNumber = {
        id: 'phone-123',
        number: '+1555123456',
        areaCode: '555',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPhoneNumber,
      } as Response)

      const result = await vapiClient.buyPhoneNumber('555')

      expect(result).toEqual(mockPhoneNumber)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/phone-number/buy',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ areaCode: '555' }),
        })
      )
    })
  })

  describe('Call Management', () => {
    test('should create outbound call', async () => {
      const mockCall = {
        id: 'call-123',
        status: 'queued',
        assistantId: 'assistant-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCall,
      } as Response)

      const result = await vapiClient.createCall({
        assistantId: 'assistant-123',
        customer: {
          number: '+1234567890',
          name: 'John Doe',
        },
      })

      expect(result).toEqual(mockCall)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/call',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"assistantId":"assistant-123"'),
        })
      )
    })

    test('should list calls with pagination', async () => {
      const mockCalls = {
        data: [
          { id: 'call-1', status: 'completed' },
          { id: 'call-2', status: 'in-progress' },
        ],
        pagination: { page: 1, limit: 50 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCalls,
      } as Response)

      const result = await vapiClient.listCalls(50, '2024-01-01T00:00:00Z')

      expect(result).toEqual(mockCalls)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/call?limit=50&createdAtGt=2024-01-01T00%3A00%3A00Z',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    test('should get specific call details', async () => {
      const mockCall = {
        id: 'call-123',
        status: 'completed',
        duration: 120,
        cost: 0.15,
        transcript: 'Hello, how can I help you?',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCall,
      } as Response)

      const result = await vapiClient.getCall('call-123')

      expect(result).toEqual(mockCall)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/call/call-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-vapi-key',
            'Content-Type': 'application/json',
          })
        })
      )
    })
  })

  describe('Utility Functions', () => {
    test('should create Vapi assistant with default configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'assistant-456' }),
      } as Response)

      process.env.NEXT_PUBLIC_URL = 'https://app.voicematrix.com'
      process.env.VAPI_WEBHOOK_SECRET = 'webhook-secret'

      const result = await createVapiAssistant({
        name: 'Real Estate Assistant',
        systemPrompt: 'You are a professional real estate assistant',
        firstMessage: 'Hello! I\'m here to help with your real estate needs.',
      })

      expect(result).toBe('assistant-456')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant',
        expect.objectContaining({
          body: expect.stringContaining('"serverUrl":"https://app.voicematrix.com/api/webhooks/vapi"'),
        })
      )
    })

    test('should handle missing VAPI client gracefully', async () => {
      // Import the function fresh with no API key
      jest.resetModules()
      process.env.VAPI_API_KEY = ''
      
      const { createVapiAssistant: createVapiAssistantNoKey } = await import('@/lib/vapi')

      const result = await createVapiAssistantNoKey({
        name: 'Test Assistant',
      })

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
      
      // Restore for other tests
      process.env.VAPI_API_KEY = 'test-vapi-key'
    })

    test('should update Vapi assistant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await updateVapiAssistant('assistant-123', {
        name: 'Updated Assistant',
        systemPrompt: 'Updated prompt',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant/assistant-123',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    test('should delete Vapi assistant without throwing on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      // Should not throw error
      await expect(deleteVapiAssistant('assistant-123')).resolves.not.toThrow()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.vapi.ai/assistant/assistant-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Error Handling', () => {
    test('should throw VapiError for API failures', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      } as Response)

      await expect(
        vapiClient.createAssistant({ name: 'Test' })
      ).rejects.toThrow(VapiError)
    })

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        vapiClient.createAssistant({ name: 'Test' })
      ).rejects.toThrow(VapiError)
    })

    test('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      await expect(
        vapiClient.createAssistant({ name: 'Test' })
      ).rejects.toThrow()
    })
  })
})