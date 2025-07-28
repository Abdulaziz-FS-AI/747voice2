import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'
import { StripeService } from '@/lib/stripe'

const signupSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['monthly', 'yearly']),
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
})

// POST /api/auth/signup-with-plan - Start signup process with plan selection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signupSchema.parse(body)
    
    const supabase = createServiceRoleClient()

    // Get the selected plan
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

    // Calculate price based on billing cycle
    const price = validatedData.billingCycle === 'monthly' 
      ? plan.price_monthly 
      : plan.price_yearly

    // For free plans or admin bypass, create account directly
    if (price === 0) {
      // This would be handled by a separate registration flow
      return NextResponse.json({
        success: true,
        data: {
          requiresPayment: false,
          redirectUrl: '/auth/register?plan=' + plan.id
        }
      })
    }

    // For paid plans, create Stripe checkout session
    const stripe = new StripeService()
    
    const checkoutSession = await stripe.createCheckoutSession({
      planId: plan.id,
      planName: plan.display_name,
      price: price,
      billingCycle: validatedData.billingCycle,
      trialPeriodDays: 14,
      customerEmail: validatedData.email,
      metadata: {
        planId: plan.id,
        billingCycle: validatedData.billingCycle,
        fullName: validatedData.fullName || '',
        companyName: validatedData.companyName || '',
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        requiresPayment: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id
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