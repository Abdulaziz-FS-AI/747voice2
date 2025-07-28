/**
 * Stripe Service - Handle payment processing and subscription management
 */

import Stripe from 'stripe'

interface CheckoutSessionParams {
  planId: string
  planName: string
  price: number
  billingCycle: 'monthly' | 'yearly'
  trialPeriodDays?: number
  customerEmail?: string
  metadata?: Record<string, string>
}

export class StripeService {
  private stripe: Stripe

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  }

  /**
   * Create a Stripe Checkout session for subscription signup
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    const {
      planId,
      planName,
      price,
      billingCycle,
      trialPeriodDays = 14,
      customerEmail,
      metadata = {}
    } = params

    // Create or get price object for this plan
    const priceObject = await this.createOrGetPrice({
      planId,
      planName,
      amount: Math.round(price * 100), // Convert to cents
      interval: billingCycle === 'monthly' ? 'month' : 'year',
    })

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceObject.id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata,
      subscription_data: {
        trial_period_days: trialPeriodDays,
        metadata,
      },
    }

    // Add customer email if provided
    if (customerEmail) {
      sessionParams.customer_email = customerEmail
    }

    return await this.stripe.checkout.sessions.create(sessionParams)
  }

  /**
   * Create or get existing Stripe price for a plan
   */
  private async createOrGetPrice(params: {
    planId: string
    planName: string
    amount: number
    interval: 'month' | 'year'
  }): Promise<Stripe.Price> {
    const { planId, planName, amount, interval } = params

    // Try to find existing price
    const existingPrices = await this.stripe.prices.list({
      lookup_keys: [`plan_${planId}_${interval}`],
      limit: 1,
    })

    if (existingPrices.data.length > 0) {
      return existingPrices.data[0]
    }

    // Create new product if it doesn't exist
    let product: Stripe.Product
    try {
      const existingProducts = await this.stripe.products.list({
        lookup_keys: [`plan_${planId}`],
        limit: 1,
      })

      if (existingProducts.data.length > 0) {
        product = existingProducts.data[0]
      } else {
        product = await this.stripe.products.create({
          name: planName,
          lookup_key: `plan_${planId}`,
          metadata: {
            planId,
          },
        })
      }
    } catch (error) {
      // Fallback: create product without lookup_key if it conflicts
      product = await this.stripe.products.create({
        name: planName,
        metadata: {
          planId,
        },
      })
    }

    // Create price
    return await this.stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
      recurring: {
        interval,
      },
      lookup_key: `plan_${planId}_${interval}`,
      metadata: {
        planId,
        interval,
      },
    })
  }

  /**
   * Retrieve a checkout session
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })
  }

  /**
   * Create a customer portal session for subscription management
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  }

  /**
   * Cancel a subscription immediately
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId)
  }

  /**
   * Update a subscription (e.g., change plan)
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    
    return await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId)
  }

  /**
   * List all subscriptions for a customer
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    })
    
    return subscriptions.data
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  }
}