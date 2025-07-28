import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'
import { StripeService } from '@/lib/stripe'

const verifyPaymentSchema = z.object({
  sessionId: z.string().min(1),
  planId: z.string().uuid(),
})

// POST /api/auth/verify-payment - Verify Stripe payment session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyPaymentSchema.parse(body)
    
    const supabase = createServiceRoleClient()
    const stripe = new StripeService()

    // Retrieve the checkout session from Stripe
    const session = await stripe.getCheckoutSession(validatedData.sessionId)

    if (!session) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Payment session not found'
        }
      }, { status: 404 })
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_COMPLETED',
          message: 'Payment has not been completed'
        }
      }, { status: 400 })
    }

    // Verify the plan matches
    const { data: plan, error: planError } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('id', validatedData.planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Selected pricing plan not found'
        }
      }, { status: 404 })
    }

    // Extract customer and subscription information
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id
    
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

    if (!customerId || !subscriptionId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SESSION_DATA',
          message: 'Missing customer or subscription information'
        }
      }, { status: 400 })
    }

    // Get subscription details from Stripe
    const subscription = await stripe.getSubscription(subscriptionId)

    if (!subscription || subscription.status !== 'trialing' && subscription.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SUBSCRIPTION',
          message: 'Subscription is not active'
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        subscriptionId,
        planId: validatedData.planId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      }, { status: 400 })
    }
    
    return handleAPIError(error)
  }
}