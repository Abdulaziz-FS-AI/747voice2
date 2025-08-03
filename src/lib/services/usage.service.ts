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
  private supabase = createServiceRoleClient('usage_enforcement');
  private vapiSync = new VapiSyncService();
  private emailService = new EmailService();

  /**
   * Check if user can create new assistant
   */
  async canCreateAssistant(userId: string): Promise<void> {
    console.log(`🔍 Checking assistant limits for user: ${userId}`);

    // Get profile with detailed selection
    let { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .select('max_assistants, max_minutes_monthly, current_usage_minutes')
      .eq('id', userId)
      .single();

    console.log('Profile query result:', { profile, profileError });

    // If no profile exists, create one with default values
    if (!profile && profileError?.code === 'PGRST116') {
      console.log('No profile found, creating default profile for user:', userId);
      
      // Get user email from auth
      const { data: authUser } = await this.supabase.auth.admin.getUserById(userId);
      
      const { data: newProfile, error: createError } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser?.user?.email || 'unknown@example.com',
          full_name: authUser?.user?.user_metadata?.full_name || 'Unknown User',
          current_usage_minutes: 0,
          max_minutes_monthly: 10,
          max_assistants: 3,  // Free users get 3 assistants as per schema
          usage_reset_date: new Date().toISOString().split('T')[0],
          onboarding_completed: false
        })
        .select('max_assistants, max_minutes_monthly, current_usage_minutes')
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        throw new Error('Failed to create user profile. Please try again.');
      }

      profile = newProfile;
      console.log('Created new profile:', profile);
    }

    // Get current assistant count  
    const { count, error: countError } = await this.supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    console.log('Assistant count query result:', { count, countError });

    // Enhanced error handling
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile error:', profileError);
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profile) {
      console.error('No profile found for user after creation attempt:', userId);
      throw new Error('User profile not found. Please contact support.');
    }

    if (profile.max_assistants === null || profile.max_assistants === undefined) {
      console.error('max_assistants is null/undefined:', profile);
      throw new Error('User limits not configured. Please contact support.');
    }

    if (countError) {
      console.error('Count error:', countError);
      throw new Error(`Assistant count error: ${countError.message}`);
    }

    if (count === null) {
      console.error('Assistant count returned null');
      throw new Error('Failed to count assistants. Please try again.');
    }

    console.log(`Assistant limits check: ${count}/${profile.max_assistants}`);

    if (count >= profile.max_assistants) {
      throw new UsageLimitError('assistants', count, profile.max_assistants);
    }

    console.log('✅ User can create assistant');
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