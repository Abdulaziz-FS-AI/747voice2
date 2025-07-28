/**
 * Authentication API Integration Tests
 * Tests for signup, signin, and profile management endpoints
 */

import { NextRequest } from 'next/server'

// Mock Next.js
jest.mock('next/server')

// Import after mocking
import { POST as signupWithPlan } from '@/app/api/auth/signup-with-plan/route'
import { POST as verifyPayment } from '@/app/api/auth/verify-payment/route'
import { createServiceRoleClient } from '@/lib/supabase'
import { StripeService } from '@/lib/stripe'

// Mock dependencies
jest.mock('@/lib/supabase')
jest.mock('@/lib/stripe')
jest.mock('@/lib/errors')

describe('Authentication API Integration', () => {
  let mockSupabase: any
  let mockStripe: any
  let mockRequest: Partial<NextRequest>

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }

    mockStripe = {
      createCheckoutSession: jest.fn(),
      getCheckoutSession: jest.fn(),
    }

    ;(createServiceRoleClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(StripeService as jest.Mock).mockImplementation(() => mockStripe)

    mockRequest = {
      json: jest.fn(),
      headers: new Headers(),
    }
  })

  describe('POST /api/auth/signup-with-plan', () => {
    test('should create checkout session for paid plan', async () => {
      const requestBody = {
        planId: 'plan-123',
        billingCycle: 'monthly',
        email: 'test@example.com',
        fullName: 'John Doe',
        companyName: 'Test Company',
      }

      const mockPlan = {
        id: 'plan-123',
        display_name: 'Professional Plan',
        price_monthly: 79,
        price_yearly: 790,
        is_active: true,
      }

      const mockCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      }

      // Mock request
      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      // Mock plan lookup
      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)

      // Mock Stripe checkout session creation
      mockStripe.createCheckoutSession.mockResolvedValue(mockCheckoutSession)

      const response = await signupWithPlan(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.requiresPayment).toBe(true)
      expect(responseData.data.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123')

      expect(mockStripe.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'plan-123',
          planName: 'Professional Plan',
          price: 79,
          billingCycle: 'monthly',
          customerEmail: 'test@example.com',
        })
      )
    })

    test('should handle free plan signup', async () => {
      const requestBody = {
        planId: 'plan-free',
        billingCycle: 'monthly',
      }

      const mockFreePlan = {
        id: 'plan-free',
        display_name: 'Free Plan',
        price_monthly: 0,
        price_yearly: 0,
        is_active: true,
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockFreePlan, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)

      const response = await signupWithPlan(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.requiresPayment).toBe(false)
      expect(responseData.data.redirectUrl).toContain('/auth/register')
    })

    test('should return error for invalid plan', async () => {
      const requestBody = {
        planId: 'invalid-plan',
        billingCycle: 'monthly',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)

      const response = await signupWithPlan(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('PLAN_NOT_FOUND')
    })

    test('should validate input data', async () => {
      const invalidRequestBody = {
        planId: 'not-a-uuid',
        billingCycle: 'invalid-cycle',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(invalidRequestBody)

      const response = await signupWithPlan(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/verify-payment', () => {
    test('should verify successful payment session', async () => {
      const requestBody = {
        sessionId: 'cs_test_123',
        planId: 'plan-123',
      }

      const mockPlan = {
        id: 'plan-123',
        display_name: 'Professional Plan',
        is_active: true,
      }

      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      }

      const mockSubscription = {
        id: 'sub_test_123',
        status: 'trialing',
        current_period_start: 1642723200, // Unix timestamp
        current_period_end: 1645315200,
        trial_end: 1643932800,
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      // Mock plan lookup
      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockPlan, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)

      // Mock Stripe calls
      mockStripe.getCheckoutSession.mockResolvedValue(mockSession)
      mockStripe.getSubscription.mockResolvedValue(mockSubscription)

      const response = await verifyPayment(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(
        expect.objectContaining({
          customerId: 'cus_test_123',
          subscriptionId: 'sub_test_123',
          planId: 'plan-123',
          status: 'trialing',
        })
      )
    })

    test('should reject unpaid session', async () => {
      const requestBody = {
        sessionId: 'cs_test_unpaid',
        planId: 'plan-123',
      }

      const mockSession = {
        id: 'cs_test_unpaid',
        payment_status: 'unpaid',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      mockStripe.getCheckoutSession.mockResolvedValue(mockSession)

      const response = await verifyPayment(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('PAYMENT_NOT_COMPLETED')
    })

    test('should handle missing session', async () => {
      const requestBody = {
        sessionId: 'cs_nonexistent',
        planId: 'plan-123',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      mockStripe.getCheckoutSession.mockResolvedValue(null)

      const response = await verifyPayment(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('SESSION_NOT_FOUND')
    })

    test('should validate session data completeness', async () => {
      const requestBody = {
        sessionId: 'cs_test_incomplete',
        planId: 'plan-123',
      }

      const mockIncompleteSession = {
        id: 'cs_test_incomplete',
        payment_status: 'paid',
        // Missing customer and subscription
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      mockStripe.getCheckoutSession.mockResolvedValue(mockIncompleteSession)

      const response = await verifyPayment(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INVALID_SESSION_DATA')
    })

    test('should validate subscription status', async () => {
      const requestBody = {
        sessionId: 'cs_test_canceled',
        planId: 'plan-123',
      }

      const mockSession = {
        id: 'cs_test_canceled',
        payment_status: 'paid',
        customer: 'cus_test_123',
        subscription: 'sub_test_canceled',
      }

      const mockCanceledSubscription = {
        id: 'sub_test_canceled',
        status: 'canceled', // Invalid status
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'plan-123', is_active: true }, 
          error: null 
        }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)
      mockStripe.getCheckoutSession.mockResolvedValue(mockSession)
      mockStripe.getSubscription.mockResolvedValue(mockCanceledSubscription)

      const response = await verifyPayment(mockRequest as NextRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error.code).toBe('INVALID_SUBSCRIPTION')
    })
  })

  describe('Error Handling', () => {
    test('should handle Stripe API errors', async () => {
      const requestBody = {
        planId: 'plan-123',
        billingCycle: 'monthly',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      const mockPlanChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { id: 'plan-123', price_monthly: 79, is_active: true }, 
          error: null 
        }),
      }

      mockSupabase.from.mockReturnValue(mockPlanChain)
      mockStripe.createCheckoutSession.mockRejectedValue(new Error('Stripe API error'))

      const response = await signupWithPlan(mockRequest as NextRequest)
      
      expect(response.status).toBeGreaterThanOrEqual(500)
    })

    test('should handle database errors', async () => {
      const requestBody = {
        planId: 'plan-123',
        billingCycle: 'monthly',
      }

      ;(mockRequest.json as jest.Mock).mockResolvedValue(requestBody)

      const mockErrorChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      }

      mockSupabase.from.mockReturnValue(mockErrorChain)

      const response = await signupWithPlan(mockRequest as NextRequest)
      
      expect(response.status).toBeGreaterThanOrEqual(500)
    })
  })
})