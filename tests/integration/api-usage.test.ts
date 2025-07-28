/**
 * Usage Tracking API Integration Tests
 * Tests for usage monitoring, cost tracking, and VAPI sync functionality
 */

import { NextRequest } from 'next/server'

// Import after mocking
import { GET as getCurrentUsage } from '@/app/api/usage/current/route'
import { POST as syncUsage, GET as getSyncStatus } from '@/app/api/usage/sync/route'
import { createServiceRoleClient } from '@/lib/supabase'
import { vapiClient } from '@/lib/vapi'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/vapi')

describe('Usage Tracking API Integration', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
      rpc: jest.fn(),
    }

    ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)

    mockRequest = {
      json: jest.fn(),
      headers: new Headers(),
    }
  })

  describe('GET /api/usage/current', () => {
    test('should return current usage data for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const mockProfile = {
        team_id: 'team-456',
      }

      const mockUsageData = [
        {
          total_calls: 150,
          total_duration: 18000, // 5 hours
          total_cost: 12.50,
          ai_model_cost: 8.00,
          transcription_cost: 2.50,
          tts_cost: 1.50,
          phone_cost: 0.50,
          period_start: '2024-01-01T00:00:00Z',
        },
      ]

      const mockDailyUsage = [
        {
          usage_date: '2024-01-15',
          total_cost: 2.50,
          calls_count: 25,
          total_duration: 3000,
        },
        {
          usage_date: '2024-01-14',
          total_cost: 1.80,
          calls_count: 18,
          total_duration: 2400,
        },
      ]

      const mockTeam = {
        cost_alert_threshold: 100.00,
        current_period_calls: 150,
        current_period_cost: 12.50,
      }

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock profile lookup
      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }

      // Mock usage data
      mockSupabase.rpc.mockResolvedValue({
        data: mockUsageData,
        error: null,
      })

      // Mock daily usage
      const mockDailyChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      }
      mockDailyChain.limit.mockResolvedValue({ data: mockDailyUsage, error: null })

      // Mock team data
      const mockTeamChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTeam, error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain) // Profile lookup
        .mockReturnValueOnce(mockDailyChain) // Daily usage
        .mockReturnValueOnce(mockTeamChain) // Team data

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(
        expect.objectContaining({
          totalCalls: 150,
          totalDuration: 18000,
          totalCost: 12.50,
          costBreakdown: {
            aiModel: 8.00,
            transcription: 2.50,
            textToSpeech: 1.50,
            phone: 0.50,
          },
          alerts: {
            costThreshold: 100.00,
            isApproachingThreshold: false,
            hasExceededThreshold: false,
            thresholdPercentage: 13,
          },
        })
      )
    })

    test('should return error for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user' },
      })

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('AUTH_REQUIRED')
    })

    test('should return error when team not found', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { team_id: null }, 
          error: null 
        }),
      }

      mockSupabase.from.mockReturnValue(mockProfileChain)

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('TEAM_NOT_FOUND')
    })

    test('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { team_id: 'team-456' }, 
          error: null 
        }),
      }

      mockSupabase.from.mockReturnValue(mockProfileChain)
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('USAGE_FETCH_FAILED')
    })
  })

  describe('POST /api/usage/sync', () => {
    test('should sync usage data from VAPI successfully', async () => {
      const mockUser = { id: 'user-123' }
      const mockProfile = { team_id: 'team-456', is_system_admin: false }

      const mockVapiCalls = {
        data: [
          {
            id: 'vapi-call-123',
            cost: 1.25,
            costBreakdown: {
              llm: 0.80,
              stt: 0.25,
              tts: 0.15,
              transport: 0.05,
            },
          },
          {
            id: 'vapi-call-456',
            cost: 0.95,
            costBreakdown: {
              llm: 0.60,
              stt: 0.20,
              tts: 0.10,
              transport: 0.05,
            },
          },
        ],
      }

      // Mock VAPI client
      ;(vapiClient as any) = {
        listCalls: jest.fn().mockResolvedValue(mockVapiCalls),
      }

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Mock profile lookup
      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }

      // Mock existing calls lookup
      const mockCallChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'db-call-123', cost: 1.00, vapi_call_id: 'vapi-call-123' },
          error: null,
        }),
      }

      // Mock call update
      const mockUpdateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }

      // Mock cost upsert
      const mockUpsertChain = {
        upsert: jest.fn().mockReturnThis(),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain) // Profile lookup
        .mockReturnValueOnce(mockCallChain) // Call lookup
        .mockReturnValueOnce(mockUpdateChain) // Call update
        .mockReturnValueOnce(mockUpsertChain) // Cost upsert

      const response = await syncUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(
        expect.objectContaining({
          syncedCalls: expect.any(Number),
          totalCostSynced: expect.any(Number),
          syncedAt: expect.any(String),
        })
      )

      expect(vapiClient.listCalls).toHaveBeenCalledWith(
        100,
        expect.any(String) // Date 7 days ago
      )
    })

    test('should handle VAPI client not configured', async () => {
      // Mock missing VAPI client
      ;(vapiClient as any) = null

      const response = await syncUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VAPI_NOT_CONFIGURED')
    })

    test('should continue syncing despite individual call errors', async () => {
      const mockUser = { id: 'user-123' }
      const mockProfile = { team_id: 'team-456' }

      const mockVapiCalls = {
        data: [
          {
            id: 'vapi-call-valid',
            cost: 1.25,
            costBreakdown: { llm: 0.80, stt: 0.25, tts: 0.15, transport: 0.05 },
          },
          {
            id: 'vapi-call-error',
            cost: 0.95,
            costBreakdown: { llm: 0.60, stt: 0.20, tts: 0.10, transport: 0.05 },
          },
        ],
      }

      ;(vapiClient as any) = {
        listCalls: jest.fn().mockResolvedValue(mockVapiCalls),
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }

      // Mock first call success, second call error
      const mockCallChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ 
            data: { id: 'db-call-1', cost: 1.00 }, 
            error: null 
          })
          .mockRejectedValueOnce(new Error('Database error')),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValue(mockCallChain)

      const response = await syncUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      // Should still succeed despite individual errors
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })
  })

  describe('GET /api/usage/sync', () => {
    test('should return sync status for authenticated user', async () => {
      const mockUser = { id: 'user-123' }
      const mockProfile = { team_id: 'team-456' }
      const mockTeam = {
        updated_at: '2024-01-15T10:30:00Z',
        current_period_calls: 150,
        current_period_cost: 12.50,
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }

      const mockTeamChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTeam, error: null }),
      }

      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValueOnce(mockTeamChain)

      const response = await getSyncStatus(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual({
        lastSyncAt: '2024-01-15T10:30:00Z',
        currentPeriodCalls: 150,
        currentPeriodCost: 12.50,
      })
    })
  })

  describe('Usage Calculations', () => {
    test('should calculate averages correctly', async () => {
      const mockUser = { id: 'user-123' }
      const mockProfile = { team_id: 'team-456' }

      const mockUsageData = [
        {
          total_calls: 100,
          total_duration: 12000, // 200 minutes total
          total_cost: 25.00,
          ai_model_cost: 15.00,
          transcription_cost: 5.00,
          tts_cost: 3.50,
          phone_cost: 1.50,
          period_start: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
      }

      mockSupabase.rpc.mockResolvedValue({
        data: mockUsageData,
        error: null,
      })

      // Mock empty daily usage and team data
      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnValue({ data: [], error: null }),
          single: jest.fn().mockResolvedValue({ 
            data: { cost_alert_threshold: 100 }, 
            error: null 
          }),
        })

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(responseData.data.averages).toEqual(
        expect.objectContaining({
          costPerCall: 0.25, // $25.00 / 100 calls
          durationPerCall: 120, // 12000 seconds / 100 calls = 120 seconds per call
        })
      )
    })

    test('should handle threshold calculations', async () => {
      const mockUsageData = [
        {
          total_calls: 50,
          total_duration: 6000,
          total_cost: 85.00, // Approaching $100 threshold
          ai_model_cost: 50.00,
          transcription_cost: 20.00,
          tts_cost: 10.00,
          phone_cost: 5.00,
          period_start: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })

      const mockProfileChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { team_id: 'team-456' }, 
          error: null 
        }),
      }

      mockSupabase.rpc.mockResolvedValue({
        data: mockUsageData,
        error: null,
      })

      mockSupabase.from
        .mockReturnValueOnce(mockProfileChain)
        .mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnValue({ data: [], error: null }),
          single: jest.fn().mockResolvedValue({ 
            data: { cost_alert_threshold: 100 }, 
            error: null 
          }),
        })

      const response = await getCurrentUsage(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(responseData.data.alerts).toEqual(
        expect.objectContaining({
          costThreshold: 100,
          isApproachingThreshold: true, // 85 >= 80 (80% of 100)
          hasExceededThreshold: false, // 85 < 100
          thresholdPercentage: 85,
        })
      )
    })
  })
})