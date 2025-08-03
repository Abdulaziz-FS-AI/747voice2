import { createServiceRoleClient } from '@/lib/supabase';
import { USAGE_WARNING_THRESHOLDS } from '@/lib/constants/user-limits';
import { VapiSyncService } from './vapi-sync.service';
import { EmailService } from './email.service';

// Simple usage limit error
export class UsageLimitError extends Error {
  constructor(public type: string, public current: number, public limit: number) {
    super(`${type} limit exceeded: ${current}/${limit}`);
    this.name = 'UsageLimitError';
  }
}

export class UsageService {
  private supabase = createServiceRoleClient();
  private vapiSync = new VapiSyncService();
  private emailService = new EmailService();

  /**
   * Check if user can create new assistant
   */
  async canCreateAssistant(userId: string): Promise<void> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('max_assistants')
      .eq('id', userId)
      .single();

    const { count } = await this.supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!profile || count === null) {
      throw new Error('Failed to check assistant limits');
    }

    if (count >= profile.max_assistants) {
      throw new UsageLimitError('assistants', count, profile.max_assistants);
    }
  }

  /**
   * Check if user can make calls (has minutes remaining)
   */
  async canMakeCalls(userId: string): Promise<boolean> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('current_usage_minutes, max_minutes_monthly')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    return profile.current_usage_minutes < profile.max_minutes_monthly;
  }

  /**
   * Update usage after call completion
   * Note: This is handled by DB trigger, but we can call it manually if needed
   */
  async updateUsageAfterCall(assistantId: string, durationSeconds: number): Promise<void> {
    // Get user from assistant
    const { data: assistant } = await this.supabase
      .from('user_assistants')
      .select('user_id')
      .eq('id', assistantId)
      .single();

    if (!assistant) return;

    const minutes = Math.ceil(durationSeconds / 60);

    // Get current usage first
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('current_usage_minutes')
      .eq('id', assistant.user_id)
      .single();

    if (!profile) return;

    // Update usage
    const { data: updatedProfile } = await this.supabase
      .from('profiles')
      .update({
        current_usage_minutes: (profile.current_usage_minutes || 0) + minutes
      })
      .eq('id', assistant.user_id)
      .select()
      .single();

    if (updatedProfile) {
      await this.checkUsageThresholds(
        assistant.user_id,
        updatedProfile.current_usage_minutes,
        updatedProfile.max_minutes_monthly
      );
    }
  }

  /**
   * Check usage thresholds and send warnings
   */
  private async checkUsageThresholds(
    userId: string,
    currentMinutes: number,
    maxMinutes: number
  ): Promise<void> {
    const percentage = currentMinutes / maxMinutes;

    // Check if we've crossed any thresholds
    if (percentage >= 1.0) {
      // Over limit - handled by trigger
      return;
    } else if (percentage >= USAGE_WARNING_THRESHOLDS.minutes.critical) {
      // 90% warning
      await this.sendUsageWarning(userId, 'critical', currentMinutes, maxMinutes);
    } else if (percentage >= USAGE_WARNING_THRESHOLDS.minutes.warning) {
      // 80% warning
      await this.sendUsageWarning(userId, 'warning', currentMinutes, maxMinutes);
    }
  }

  /**
   * Send usage warning email (throttled)
   */
  private async sendUsageWarning(
    userId: string,
    level: 'warning' | 'critical',
    currentMinutes: number,
    maxMinutes: number
  ): Promise<void> {
    // Check if we already sent a warning recently
    const { data: recentWarning } = await this.supabase
      .from('subscription_events')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'usage_warning')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    if (recentWarning) return; // Already warned in last 24 hours

    // Log warning event
    await this.supabase
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'usage_warning',
        metadata: {
          level,
          currentMinutes,
          maxMinutes,
          percentage: Math.round((currentMinutes / maxMinutes) * 100)
        }
      });

    // Send email
    await this.emailService.sendUsageWarningEmail(userId, level, currentMinutes, maxMinutes);
  }

  /**
   * Disable all assistants for a user (when limit exceeded)
   */
  async disableUserAssistants(userId: string, reason: string): Promise<void> {
    // Get all active assistants
    const { data: assistants } = await this.supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id')
      .eq('user_id', userId)
      .eq('is_disabled', false);

    if (!assistants) return;

    // Queue VAPI updates
    for (const assistant of assistants) {
      await this.vapiSync.queueSync(
        assistant.id,
        assistant.vapi_assistant_id,
        'disable',
        reason,
        1 // High priority
      );
    }

    // Update local state
    await this.supabase
      .from('user_assistants')
      .update({
        is_disabled: true,
        disabled_at: new Date().toISOString(),
        disabled_reason: reason,
        assistant_state: 'disabled_usage'
      })
      .eq('user_id', userId)
      .eq('is_disabled', false);
  }

  /**
   * Re-enable assistants after limit reset or upgrade
   */
  async enableUserAssistants(userId: string, reason: string): Promise<void> {
    // Get disabled assistants
    const { data: assistants } = await this.supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id')
      .eq('user_id', userId)
      .eq('is_disabled', true)
      .eq('disabled_reason', 'usage_limit_exceeded');

    if (!assistants) return;

    // Queue VAPI updates
    for (const assistant of assistants) {
      await this.vapiSync.queueSync(
        assistant.id,
        assistant.vapi_assistant_id,
        'enable',
        reason,
        2 // Medium priority
      );
    }

    // Update local state
    await this.supabase
      .from('user_assistants')
      .update({
        is_disabled: false,
        disabled_at: null,
        disabled_reason: null,
        assistant_state: 'active'
      })
      .eq('user_id', userId)
      .eq('disabled_reason', 'usage_limit_exceeded');
  }

  /**
   * Get usage summary for multiple users (admin)
   */
  async getSystemUsageSummary(): Promise<any> {
    const { data: usageData } = await this.supabase
      .from('profiles')
      .select(`
        id,
        subscription_type,
        current_usage_minutes,
        max_minutes_monthly
      `)
      .order('current_usage_minutes', { ascending: false })
      .limit(100);

    if (!usageData) return [];

    // Get assistant counts separately for each user
    const summaryPromises = usageData.map(async (user) => {
      const { count: assistantCount } = await this.supabase
        .from('user_assistants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        subscriptionType: user.subscription_type,
        usagePercentage: Math.round((user.current_usage_minutes / user.max_minutes_monthly) * 100),
        minutesUsed: user.current_usage_minutes,
        minutesLimit: user.max_minutes_monthly,
        assistantCount: assistantCount || 0
      };
    });

    return Promise.all(summaryPromises);
  }
}