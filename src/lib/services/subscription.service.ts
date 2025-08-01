import { createServiceRoleClient } from '@/lib/supabase';
import { SubscriptionType, SubscriptionStatus, UserSubscription, SubscriptionEvent, SubscriptionError } from '@/lib/types/subscription.types';
import { SUBSCRIPTION_PLANS, getPlanLimits } from '@/lib/constants/subscription-plans';
import { VapiSyncService } from './vapi-sync.service';
import { EmailService } from './email.service';

export class SubscriptionService {
  private supabase = createServiceRoleClient();
  private vapiSync = new VapiSyncService();
  private emailService = new EmailService();

  /**
   * Get user's current subscription details
   */
  async getSubscription(userId: string): Promise<UserSubscription> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select(`
        *,
        user_assistants!inner(count)
      `)
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new SubscriptionError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Get assistant count
    const { count: assistantCount } = await this.supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      userId: profile.id,
      type: profile.subscription_type as SubscriptionType,
      status: profile.subscription_status as SubscriptionStatus,
      currentUsageMinutes: profile.current_usage_minutes || 0,
      maxMinutesMonthly: profile.max_minutes_monthly || 10,
      currentAssistantCount: assistantCount || 0,
      maxAssistants: profile.max_assistants || 1,
      billingCycleStart: new Date(profile.billing_cycle_start),
      billingCycleEnd: new Date(profile.billing_cycle_end),
      stripeCustomerId: profile.stripe_customer_id,
      stripeSubscriptionId: profile.stripe_subscription_id
    };
  }

  /**
   * Update user's subscription
   */
  async updateSubscription(
    userId: string, 
    newPlan: SubscriptionType,
    stripeSubscriptionId?: string
  ): Promise<void> {
    const currentSub = await this.getSubscription(userId);
    const planLimits = getPlanLimits(newPlan);

    // Start transaction
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({
        subscription_type: newPlan,
        subscription_status: 'active',
        max_assistants: planLimits.maxAssistants,
        max_minutes_monthly: planLimits.maxMinutesMonthly,
        stripe_subscription_id: stripeSubscriptionId || currentSub.stripeSubscriptionId,
        // Reset usage if upgrading
        ...(newPlan === 'pro' && currentSub.type === 'free' ? {
          current_usage_minutes: 0,
          billing_cycle_start: new Date().toISOString(),
          billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        } : {})
      })
      .eq('id', userId);

    if (updateError) {
      throw new SubscriptionError('Failed to update subscription', 'UPDATE_FAILED');
    }

    // Log event
    await this.logSubscriptionEvent({
      type: currentSub.type === 'free' && newPlan === 'pro' ? 'upgraded' : 'downgraded',
      userId,
      fromPlan: currentSub.type,
      toPlan: newPlan,
      metadata: {
        oldLimits: getPlanLimits(currentSub.type),
        newLimits: planLimits
      }
    });

    // Handle downgrade cleanup
    if (newPlan === 'free' && currentSub.type === 'pro') {
      await this.handleDowngrade(userId, currentSub.currentAssistantCount);
    }

    // Re-enable assistants if upgrading and was over limit
    if (newPlan === 'pro' && currentSub.currentUsageMinutes < planLimits.maxMinutesMonthly) {
      await this.reEnableAssistants(userId);
    }

    // Send confirmation email
    await this.emailService.sendSubscriptionChangeEmail(userId, currentSub.type, newPlan);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_type: 'free',
        // Keep current limits until billing cycle ends
      })
      .eq('id', userId);

    if (error) {
      throw new SubscriptionError('Failed to cancel subscription', 'CANCEL_FAILED');
    }

    await this.logSubscriptionEvent({
      type: 'cancelled',
      userId,
      metadata: { cancelledAt: new Date().toISOString() }
    });

    await this.emailService.sendCancellationEmail(userId);
  }

  /**
   * Check if user can perform action based on limits
   */
  async checkLimits(
    userId: string, 
    limitType: 'assistants' | 'minutes',
    increment: number = 1
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getSubscription(userId);

    if (limitType === 'assistants') {
      const allowed = subscription.currentAssistantCount + increment <= subscription.maxAssistants;
      return {
        allowed,
        current: subscription.currentAssistantCount,
        limit: subscription.maxAssistants
      };
    } else {
      const allowed = subscription.currentUsageMinutes + increment <= subscription.maxMinutesMonthly;
      return {
        allowed,
        current: subscription.currentUsageMinutes,
        limit: subscription.maxMinutesMonthly
      };
    }
  }

  /**
   * Handle downgrade by removing excess assistants
   */
  private async handleDowngrade(userId: string, currentAssistantCount: number): Promise<void> {
    const freePlanLimits = getPlanLimits('free');
    
    if (currentAssistantCount > freePlanLimits.maxAssistants) {
      // Delete newest assistants first
      const { data: assistantsToDelete } = await this.supabase
        .from('user_assistants')
        .select('id, vapi_assistant_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(currentAssistantCount - freePlanLimits.maxAssistants);

      if (assistantsToDelete) {
        // Queue for VAPI deletion
        for (const assistant of assistantsToDelete) {
          await this.vapiSync.queueSync(
            assistant.id,
            assistant.vapi_assistant_id,
            'delete',
            'subscription_downgrade'
          );
        }

        // Delete from our DB
        const { error } = await this.supabase
          .from('user_assistants')
          .delete()
          .in('id', assistantsToDelete.map(a => a.id));

        if (error) {
          console.error('Failed to delete excess assistants:', error);
        }
      }
    }
  }

  /**
   * Re-enable assistants after upgrade or reset
   */
  private async reEnableAssistants(userId: string): Promise<void> {
    const { data: disabledAssistants } = await this.supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id')
      .eq('user_id', userId)
      .eq('is_disabled', true)
      .eq('disabled_reason', 'usage_limit_exceeded');

    if (disabledAssistants) {
      for (const assistant of disabledAssistants) {
        await this.vapiSync.queueSync(
          assistant.id,
          assistant.vapi_assistant_id,
          'enable',
          'subscription_upgraded'
        );
      }

      // Mark as active again
      await this.supabase
        .from('user_assistants')
        .update({
          is_disabled: false,
          disabled_at: null,
          disabled_reason: null,
          assistant_state: 'active'
        })
        .in('id', disabledAssistants.map(a => a.id));
    }
  }

  /**
   * Log subscription event
   */
  private async logSubscriptionEvent(event: SubscriptionEvent): Promise<void> {
    const { error } = await this.supabase
      .from('subscription_events')
      .insert({
        user_id: event.userId,
        event_type: event.type,
        from_plan: event.fromPlan,
        to_plan: event.toPlan,
        metadata: event.metadata
      });

    if (error) {
      console.error('Failed to log subscription event:', error);
    }
  }

  /**
   * Get usage details for a user
   */
  async getUsageDetails(userId: string): Promise<any> {
    const subscription = await this.getSubscription(userId);
    
    // Calculate days until reset
    const daysUntilReset = Math.ceil(
      (subscription.billingCycleEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Get call statistics
    const { data: callStats } = await this.supabase
      .from('call_logs')
      .select('duration_seconds, cost, success_evaluation')
      .eq('assistant_id', userId)
      .gte('started_at', subscription.billingCycleStart.toISOString());

    const totalCalls = callStats?.length || 0;
    const successfulCalls = callStats?.filter(c => 
      c.success_evaluation === 'successful' || c.success_evaluation === 'qualified'
    ).length || 0;
    const averageDuration = totalCalls > 0 
      ? (callStats?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0) / totalCalls / 60
      : 0;

    return {
      minutes: {
        used: subscription.currentUsageMinutes,
        limit: subscription.maxMinutesMonthly,
        percentage: Math.round((subscription.currentUsageMinutes / subscription.maxMinutesMonthly) * 100),
        daysUntilReset
      },
      assistants: {
        count: subscription.currentAssistantCount,
        limit: subscription.maxAssistants,
        percentage: Math.round((subscription.currentAssistantCount / subscription.maxAssistants) * 100)
      },
      calls: {
        totalThisMonth: totalCalls,
        successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
        averageDuration: Math.round(averageDuration * 10) / 10
      }
    };
  }
}