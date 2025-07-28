/**
 * Stripe Payment Processing Tests
 * Critical tests for payment flows and subscription management
 */

import { StripeService } from '@/lib/stripe'
import Stripe from 'stripe'

// Mock Stripe
jest.mock('stripe')

describe('Stripe Payment Processing', () => {
  let stripeService: StripeService
  let mockStripe: jest.Mocked<Stripe>

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Mock the Stripe constructor
    mockStripe = {
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      prices: {
        list: jest.fn(),
        create: jest.fn(),
      },
      products: {
        list: jest.fn(),
        create: jest.fn(),
      },
      subscriptions: {
        retrieve: jest.fn(),
        cancel: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    } as any

    ;(Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe)

    // Set up environment
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
    
    stripeService = new StripeService()
  })

  describe('Checkout Session Creation', () => {
    test('should create checkout session for valid plan', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        payment_status: 'unpaid',
      }

      const mockPrice = {
        id: 'price_test_123',
        unit_amount: 2900,
        currency: 'usd',
      }

      mockStripe.prices.list.mockResolvedValue({
        data: [],
      } as any)

      mockStripe.products.create.mockResolvedValue({
        id: 'prod_test_123',
        name: 'Professional Plan',
      } as any)

      mockStripe.prices.create.mockResolvedValue(mockPrice as any)

      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession as any)

      const result = await stripeService.createCheckoutSession({
        planId: 'plan-pro',
        planName: 'Professional Plan',
        price: 29.00,
        billingCycle: 'monthly',
        customerEmail: 'test@example.com',
      })

      expect(result.id).toBe('cs_test_123')
      expect(result.url).toBe('https://checkout.stripe.com/pay/cs_test_123')
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: 'price_test_123',
              quantity: 1,
            },
          ],
        })
      )
    })

    test('should handle checkout session creation failure', async () => {
      mockStripe.prices.list.mockRejectedValue(new Error('Stripe API error'))

      await expect(
        stripeService.createCheckoutSession({
          planId: 'plan-pro',
          planName: 'Professional Plan',
          price: 29.00,
          billingCycle: 'monthly',
        })
      ).rejects.toThrow('Stripe API error')
    })

    test('should use existing price if available', async () => {
      const existingPrice = {
        id: 'price_existing_123',
        unit_amount: 2900,
      }

      mockStripe.prices.list.mockResolvedValue({
        data: [existingPrice],
      } as any)

      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      } as any)

      await stripeService.createCheckoutSession({
        planId: 'plan-pro',
        planName: 'Professional Plan',
        price: 29.00,
        billingCycle: 'monthly',
      })

      expect(mockStripe.prices.create).not.toHaveBeenCalled()
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_existing_123',
              quantity: 1,
            },
          ],
        })
      )
    })
  })

  describe('Session Retrieval', () => {
    test('should retrieve checkout session with expanded data', async () => {
      const mockSession = {
        id: 'cs_test_123',
        payment_status: 'paid',
        customer: {
          id: 'cus_test_123',
          email: 'test@example.com',
        },
        subscription: {
          id: 'sub_test_123',
          status: 'active',
        },
      }

      mockStripe.checkout.sessions.retrieve.mockResolvedValue(mockSession as any)

      const result = await stripeService.getCheckoutSession('cs_test_123')

      expect(result).toEqual(mockSession)
      expect(mockStripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
        'cs_test_123',
        { expand: ['subscription', 'customer'] }
      )
    })
  })

  describe('Subscription Management', () => {
    test('should cancel subscription immediately', async () => {
      const mockCancelledSubscription = {
        id: 'sub_test_123',
        status: 'canceled',
        canceled_at: Date.now() / 1000,
      }

      mockStripe.subscriptions.cancel.mockResolvedValue(mockCancelledSubscription as any)

      const result = await stripeService.cancelSubscription('sub_test_123')

      expect(result.status).toBe('canceled')
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test_123')
    })

    test('should update subscription with new price', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        items: {
          data: [{ id: 'si_test_123' }],
        },
      }

      const mockUpdatedSubscription = {
        id: 'sub_test_123',
        status: 'active',
      }

      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription as any)
      mockStripe.subscriptions.update.mockResolvedValue(mockUpdatedSubscription as any)

      const result = await stripeService.updateSubscription('sub_test_123', 'price_new_123')

      expect(result.status).toBe('active')
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_test_123',
        expect.objectContaining({
          items: [
            {
              id: 'si_test_123',
              price: 'price_new_123',
            },
          ],
          proration_behavior: 'create_prorations',
        })
      )
    })
  })

  describe('Webhook Verification', () => {
    test('should verify valid webhook signature', () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {},
      }

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent as any)

      const result = stripeService.verifyWebhookSignature(
        '{"id":"evt_test_123"}',
        'test_signature'
      )

      expect(result).toEqual(mockEvent)
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"id":"evt_test_123"}',
        'test_signature',
        'whsec_test_secret'
      )
    })

    test('should throw error for invalid webhook signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      expect(() => {
        stripeService.verifyWebhookSignature('{"id":"evt_test_123"}', 'invalid_signature')
      }).toThrow('Invalid signature')
    })

    test('should throw error when webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      expect(() => {
        stripeService.verifyWebhookSignature('{"id":"evt_test_123"}', 'signature')
      }).toThrow('STRIPE_WEBHOOK_SECRET is not configured')
    })
  })

  describe('Price Management', () => {
    test('should create new price when none exists', async () => {
      const mockProduct = {
        id: 'prod_test_123',
        name: 'Test Plan',
      }

      const mockPrice = {
        id: 'price_test_123',
        unit_amount: 2900,
        currency: 'usd',
        recurring: { interval: 'month' },
      }

      mockStripe.prices.list.mockResolvedValue({ data: [] } as any)
      mockStripe.products.list.mockResolvedValue({ data: [] } as any)
      mockStripe.products.create.mockResolvedValue(mockProduct as any)
      mockStripe.prices.create.mockResolvedValue(mockPrice as any)

      // Access private method via type assertion for testing
      const result = await (stripeService as any).createOrGetPrice({
        planId: 'test-plan',
        planName: 'Test Plan',
        amount: 2900,
        interval: 'month',
      })

      expect(result).toEqual(mockPrice)
      expect(mockStripe.products.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Plan',
          metadata: {
            planId: 'test-plan',
          },
        })
      )
      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_amount: 2900,
          currency: 'usd',
          recurring: { interval: 'month' },
        })
      )
    })
  })
})