import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth/next-auth-compat';
import { PaymentService } from '@/lib/services/payment.service';
import { handleApiError } from '@/lib/utils/api-utils';

const paymentService = new PaymentService();

// GET /api/subscription/payment-history - Get user's payment history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const payments = await paymentService.getPaymentHistory(session.user.id);

    return NextResponse.json({
      data: {
        payments,
        count: payments.length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}