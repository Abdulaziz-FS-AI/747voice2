import { createServiceRoleClient } from '@/lib/supabase';
// Note: Payment service is deprecated in simplified system
// Keeping for reference but not actively used

export class PaymentService {
  private supabase = createServiceRoleClient();
  private paypal: PayPalService;

  constructor() {
    this.paypal = new PayPalService();
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    planId: SubscriptionType
  ): Promise<string> {
    if (planId !== 'pro') {
      throw new SubscriptionError('Only Pro plan requires payment', 'INVALID_PLAN');
    }

    // Create PayPal subscription
    const { approvalUrl } = await this.paypal.createSubscription(
      userId,
      email,
      planId
    );

    return approvalUrl;
  }

  /**
   * Handle subscription activation after payment
   */
  async activateSubscription(subscriptionId: string): Promise<void> {
    await this.paypal.activateSubscription(subscriptionId);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    await this.paypal.cancelSubscription(userId);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string): Promise<any[]> {
    return await this.paypal.getPaymentHistory(userId);
  }

  /**
   * Handle webhook events from PayPal
   */
  async handleWebhookEvent(headers: any, body: any): Promise<void> {
    await this.paypal.processWebhookEvent(headers, body);
  }

  /**
   * Create payment method management session
   */
  async createPaymentMethodSession(userId: string): Promise<string> {
    // For PayPal, redirect to PayPal account settings
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('paypal_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.paypal_subscription_id) {
      throw new SubscriptionError('No active subscription found', 'NO_SUBSCRIPTION');
    }

    // Return PayPal subscription management URL
    const mode = process.env.PAYPAL_MODE === 'live' ? 'www' : 'www.sandbox';
    return `https://${mode}.paypal.com/myaccount/autopay/`;
  }

  /**
   * Get subscription details from PayPal
   */
  async getSubscriptionDetails(subscriptionId: string): Promise<any> {
    return await this.paypal.getSubscriptionDetails(subscriptionId);
  }

  /**
   * Verify if user has active PayPal subscription
   */
  async verifyActiveSubscription(userId: string): Promise<boolean> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('paypal_subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile?.paypal_subscription_id || profile.subscription_status !== 'active') {
      return false;
    }

    try {
      const subscription = await this.paypal.getSubscriptionDetails(profile.paypal_subscription_id);
      return subscription.status === 'ACTIVE';
    } catch (error) {
      console.error('Failed to verify PayPal subscription:', error);
      return false;
    }
  }

  /**
   * Sync subscription status with PayPal
   */
  async syncSubscriptionStatus(userId: string): Promise<void> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('paypal_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.paypal_subscription_id) {
      return;
    }

    try {
      const subscription = await this.paypal.getSubscriptionDetails(profile.paypal_subscription_id);
      
      // Map PayPal status to our status
      let status: string;
      switch (subscription.status) {
        case 'ACTIVE':
          status = 'active';
          break;
        case 'SUSPENDED':
          status = 'past_due';
          break;
        case 'CANCELLED':
        case 'EXPIRED':
          status = 'cancelled';
          break;
        default:
          status = 'inactive';
      }

      // Update if different
      await this.supabase
        .from('profiles')
        .update({ subscription_status: status })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to sync subscription status:', error);
    }
  }

  /**
   * Generate invoice for payment
   */
  async generateInvoice(paymentId: string): Promise<string> {
    const { data: payment } = await this.supabase
      .from('payment_history')
      .select('*, profiles!inner(email, full_name)')
      .eq('transaction_id', paymentId)
      .single();

    if (!payment) {
      throw new SubscriptionError('Payment not found', 'PAYMENT_NOT_FOUND');
    }

    // Generate invoice number
    const { data: invoice } = await this.supabase
      .rpc('generate_invoice_number')
      .single();

    // Create invoice record
    const { data: newInvoice } = await this.supabase
      .from('invoices')
      .insert({
        user_id: payment.user_id,
        invoice_number: invoice,
        transaction_id: paymentId,
        amount: payment.amount,
        total: payment.amount,
        currency: payment.currency,
        status: 'paid',
        paid_date: payment.created_at,
        line_items: [{
          description: 'Voice Matrix Pro - Monthly Subscription',
          quantity: 1,
          unit_price: payment.amount,
          total: payment.amount
        }],
        billing_details: {
          name: payment.profiles.full_name,
          email: payment.profiles.email
        }
      })
      .select()
      .single();

    // TODO: Generate PDF and upload to storage
    // For now, return invoice ID
    return newInvoice?.id || '';
  }
}