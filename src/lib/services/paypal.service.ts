import { createServiceRoleClient } from '@/lib/supabase';
import { SubscriptionType, SubscriptionError } from '@/lib/types/subscription.types';
import { SUBSCRIPTION_PLANS } from '@/lib/constants/subscription-plans';

// PayPal API types
interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalSubscription {
  id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  subscriber: {
    payer_id: string;
    email_address: string;
    name: {
      given_name?: string;
      surname?: string;
    };
  };
  billing_info: {
    outstanding_balance: {
      currency_code: string;
      value: string;
    };
    last_payment?: {
      amount: {
        currency_code: string;
        value: string;
      };
      time: string;
    };
  };
  create_time: string;
  update_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export class PayPalService {
  private supabase = createServiceRoleClient();
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID!;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
    this.baseUrl = process.env.PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new SubscriptionError('Failed to authenticate with PayPal', 'PAYPAL_AUTH_ERROR');
    }

    const data: PayPalAccessToken = await response.json();
    
    // Cache the token
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000); // Subtract 60s for safety
    
    return this.accessToken;
  }

  /**
   * Make authenticated PayPal API request
   */
  private async paypalRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal API error:', data);
      throw new SubscriptionError(
        data.message || 'PayPal API error',
        'PAYPAL_API_ERROR',
        response.status
      );
    }

    return data;
  }

  /**
   * Create subscription for user
   */
  async createSubscription(
    userId: string,
    email: string,
    planId: SubscriptionType
  ): Promise<{ subscriptionId: string; approvalUrl: string }> {
    if (planId !== 'pro') {
      throw new SubscriptionError('Only Pro plan requires payment', 'INVALID_PLAN');
    }

    const proPlanId = process.env.PAYPAL_PRO_PLAN_ID;
    if (!proPlanId) {
      throw new SubscriptionError('PayPal plan not configured', 'CONFIGURATION_ERROR');
    }

    // Create subscription
    const subscription = await this.paypalRequest('/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: proPlanId,
        subscriber: {
          email_address: email
        },
        application_context: {
          brand_name: 'Voice Matrix',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscription/paypal/success`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/billing?cancelled=true`
        }
      })
    });

    // Save initial subscription data
    await this.supabase
      .from('profiles')
      .update({
        paypal_subscription_id: subscription.id
      })
      .eq('id', userId);

    // Find approval URL
    const approvalLink = subscription.links.find((link: any) => link.rel === 'approve');
    if (!approvalLink) {
      throw new SubscriptionError('No approval URL in PayPal response', 'PAYPAL_ERROR');
    }

    return {
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href
    };
  }

  /**
   * Activate subscription after user approval
   */
  async activateSubscription(subscriptionId: string): Promise<void> {
    // Get subscription details
    const subscription = await this.getSubscriptionDetails(subscriptionId);
    
    if (subscription.status !== 'ACTIVE') {
      throw new SubscriptionError(
        `Subscription is not active: ${subscription.status}`,
        'SUBSCRIPTION_NOT_ACTIVE'
      );
    }

    // Update user profile
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('paypal_subscription_id', subscriptionId)
      .single();

    if (!profile) {
      throw new SubscriptionError('User not found for subscription', 'USER_NOT_FOUND');
    }

    await this.supabase
      .from('profiles')
      .update({
        subscription_type: 'pro',
        subscription_status: 'active',
        max_assistants: SUBSCRIPTION_PLANS.pro.features.maxAssistants,
        max_minutes_monthly: SUBSCRIPTION_PLANS.pro.features.maxMinutesMonthly,
        paypal_payer_id: subscription.subscriber.payer_id,
        payment_method_type: 'paypal',
        current_usage_minutes: 0, // Reset usage on upgrade
        billing_cycle_start: new Date().toISOString(),
        billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', profile.id);

    // Log event
    await this.supabase
      .from('subscription_events')
      .insert({
        user_id: profile.id,
        event_type: 'upgraded',
        from_plan: 'free',
        to_plan: 'pro',
        metadata: { 
          paypal_subscription_id: subscriptionId,
          payer_id: subscription.subscriber.payer_id
        }
      });
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(subscriptionId: string): Promise<PayPalSubscription> {
    return await this.paypalRequest(`/v1/billing/subscriptions/${subscriptionId}`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, reason?: string): Promise<void> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('paypal_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.paypal_subscription_id) {
      throw new SubscriptionError('No active subscription found', 'NO_SUBSCRIPTION');
    }

    // Cancel in PayPal
    await this.paypalRequest(
      `/v1/billing/subscriptions/${profile.paypal_subscription_id}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({
          reason: reason || 'Customer requested cancellation'
        })
      }
    );

    // Update profile - keep Pro until end of billing period
    await this.supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled'
      })
      .eq('id', userId);

    // Log event
    await this.supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'cancelled',
        metadata: { 
          reason,
          paypal_subscription_id: profile.paypal_subscription_id
        }
      });
  }

  /**
   * Suspend subscription (for payment failures)
   */
  async suspendSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.paypalRequest(
      `/v1/billing/subscriptions/${subscriptionId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
  }

  /**
   * Reactivate suspended subscription
   */
  async reactivateSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.paypalRequest(
      `/v1/billing/subscriptions/${subscriptionId}/activate`,
      {
        method: 'POST',
        body: JSON.stringify({ reason })
      }
    );
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(headers: any, body: any): Promise<void> {
    // Verify webhook signature
    const isValid = await this.verifyWebhookSignature(headers, body);
    if (!isValid) {
      throw new SubscriptionError('Invalid webhook signature', 'INVALID_WEBHOOK');
    }

    // Check if we've already processed this event (idempotency)
    const { data: existingEvent } = await this.supabase
      .from('paypal_webhook_events')
      .select('id')
      .eq('id', body.id)
      .single();

    if (existingEvent) {
      console.log('Webhook event already processed:', body.id);
      return;
    }

    // Store the event
    await this.supabase
      .from('paypal_webhook_events')
      .insert({
        id: body.id,
        event_type: body.event_type,
        resource_type: body.resource_type,
        resource_id: body.resource?.id,
        summary: body.summary,
        raw_data: body
      });

    // Process based on event type
    switch (body.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await this.handleSubscriptionActivated(body.resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.handleSubscriptionCancelled(body.resource);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.handleSubscriptionSuspended(body.resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await this.handlePaymentCompleted(body.resource);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        await this.handlePaymentRefunded(body.resource);
        break;

      default:
        console.log('Unhandled webhook event type:', body.event_type);
    }

    // Mark as processed
    await this.supabase
      .from('paypal_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', body.id);
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(headers: any, body: any): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      console.error('PAYPAL_WEBHOOK_ID not configured');
      return false;
    }

    try {
      const verification = await this.paypalRequest('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: body
        })
      });

      return verification.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('Webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Handle subscription activated
   */
  private async handleSubscriptionActivated(subscription: any): Promise<void> {
    await this.activateSubscription(subscription.id);
  }

  /**
   * Handle subscription cancelled
   */
  private async handleSubscriptionCancelled(subscription: any): Promise<void> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('paypal_subscription_id', subscription.id)
      .single();

    if (!profile) return;

    // Downgrade to free at end of billing period
    await this.supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled'
      })
      .eq('id', profile.id);
  }

  /**
   * Handle subscription suspended (payment failure)
   */
  private async handleSubscriptionSuspended(subscription: any): Promise<void> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('paypal_subscription_id', subscription.id)
      .single();

    if (!profile) return;

    await this.supabase
      .from('profiles')
      .update({
        subscription_status: 'past_due'
      })
      .eq('id', profile.id);

    await this.supabase
      .from('subscription_events')
      .insert({
        user_id: profile.id,
        event_type: 'payment_failed',
        metadata: { reason: 'Subscription suspended due to payment failure' }
      });
  }

  /**
   * Handle payment completed
   */
  private async handlePaymentCompleted(payment: any): Promise<void> {
    // Record payment history
    await this.supabase
      .from('payment_history')
      .insert({
        transaction_id: payment.id,
        payment_provider: 'paypal',
        amount: parseFloat(payment.amount.total),
        currency: payment.amount.currency,
        status: 'completed',
        payment_method: 'paypal',
        description: payment.description || 'Voice Matrix Pro Subscription',
        metadata: payment
      });

    // If this is a subscription payment, reset usage
    if (payment.billing_agreement_id) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('paypal_subscription_id', payment.billing_agreement_id)
        .single();

      if (profile) {
        await this.supabase
          .from('profiles')
          .update({
            current_usage_minutes: 0,
            billing_cycle_start: new Date().toISOString(),
            billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', profile.id);

        await this.supabase
          .from('subscription_events')
          .insert({
            user_id: profile.id,
            event_type: 'renewed',
            metadata: { payment_id: payment.id, amount: payment.amount.total }
          });
      }
    }
  }

  /**
   * Handle payment refunded
   */
  private async handlePaymentRefunded(refund: any): Promise<void> {
    // Update payment history
    await this.supabase
      .from('payment_history')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', refund.sale_id);

    // Log refund event
    const { data: payment } = await this.supabase
      .from('payment_history')
      .select('user_id')
      .eq('transaction_id', refund.sale_id)
      .single();

    if (payment) {
      await this.supabase
        .from('subscription_events')
        .insert({
          user_id: payment.user_id,
          event_type: 'refund_processed',
          metadata: { 
            refund_id: refund.id,
            amount: refund.amount.total,
            reason: refund.reason
          }
        });
    }
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Create one-time payment link (for add-ons, etc)
   */
  async createPaymentLink(
    userId: string,
    amount: number,
    description: string
  ): Promise<string> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new SubscriptionError('User not found', 'USER_NOT_FOUND');
    }

    const order = await this.paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2)
          },
          description
        }],
        application_context: {
          brand_name: 'Voice Matrix',
          return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/subscription/paypal/capture`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/settings/billing`
        }
      })
    });

    const approveLink = order.links.find((link: any) => link.rel === 'approve');
    return approveLink?.href || '';
  }
}