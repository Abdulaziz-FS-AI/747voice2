import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { PaymentService } from '@/lib/services/payment.service';

const paymentService = new PaymentService();

// POST /api/subscription/paypal/webhook - Handle PayPal webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headersList = await headers();
    
    // Extract PayPal headers
    const paypalHeaders = {
      'paypal-auth-algo': headersList.get('paypal-auth-algo'),
      'paypal-cert-url': headersList.get('paypal-cert-url'),
      'paypal-transmission-id': headersList.get('paypal-transmission-id'),
      'paypal-transmission-sig': headersList.get('paypal-transmission-sig'),
      'paypal-transmission-time': headersList.get('paypal-transmission-time'),
    };

    console.log(`Processing PayPal webhook event: ${body.event_type}`);

    await paymentService.handleWebhookEvent(paypalHeaders, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// PayPal webhooks require standard runtime (not edge)
export const runtime = 'nodejs';