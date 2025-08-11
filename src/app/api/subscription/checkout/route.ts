import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { PaymentService } from '@/lib/services/payment.service';
import { z } from 'zod';

const paymentService = new PaymentService();

const CheckoutSchema = z.object({
  planId: z.enum(['pro']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

// POST /api/subscription/checkout - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    
    const body = await request.json();
    const validatedData = CheckoutSchema.parse(body);
    
    const checkoutUrl = await paymentService.createCheckoutSession(
      user.id,
      user.email || '',
      validatedData.planId
    );
    
    return NextResponse.json({
      success: true,
      data: {
        url: checkoutUrl
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}