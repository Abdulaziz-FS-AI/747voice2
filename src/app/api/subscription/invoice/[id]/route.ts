import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth/next-auth-compat';
import { PaymentService } from '@/lib/services/payment.service';
import { handleApiError } from '@/lib/utils/api-utils';

const paymentService = new PaymentService();

// GET /api/subscription/invoice/[id] - Generate invoice for payment
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const invoiceId = await paymentService.generateInvoice(params.id);

    return NextResponse.json({
      data: {
        invoiceId,
        message: 'Invoice generated successfully'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}