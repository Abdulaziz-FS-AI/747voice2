import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PaymentService } from '@/lib/services/payment.service';
import { handleApiError } from '@/lib/utils/api-utils';
import { authOptions } from '@/lib/auth';

const paymentService = new PaymentService();

// GET /api/subscription/invoice/[id] - Generate invoice for payment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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