import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { PaymentService } from '@/lib/services/payment.service';

const paymentService = new PaymentService();

// POST /api/subscription/portal - Create customer portal session
export async function POST(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    
    const body = await request.json();
    const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/settings/subscription`;
    
    const portalUrl = await paymentService.createPaymentMethodSession(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        url: portalUrl
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}