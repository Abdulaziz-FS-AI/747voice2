import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth/next-auth-compat';
import { PaymentService } from '@/lib/services/payment.service';
import { handleApiError } from '@/lib/utils/api-utils';

const paymentService = new PaymentService();

// POST /api/subscription/paypal/activate - Activate PayPal subscription after approval
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: { message: 'Subscription ID is required', code: 'INVALID_REQUEST' } },
        { status: 400 }
      );
    }

    // Activate the subscription
    await paymentService.activateSubscription(subscriptionId);

    // Sync subscription status
    await paymentService.syncSubscriptionStatus(session.user.id);

    return NextResponse.json({
      data: {
        success: true,
        message: 'Subscription activated successfully'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}