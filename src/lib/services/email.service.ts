import { createServiceRoleClient } from '@/lib/supabase';
import { Resend } from 'resend';

export class EmailService {
  private supabase = createServiceRoleClient();
  private resend: Resend | null = null;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  /**
   * Send usage warning email
   */
  async sendUsageWarningEmail(
    userId: string,
    level: 'warning' | 'critical',
    currentMinutes: number,
    maxMinutes: number
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user || !this.resend) return;

    const percentage = Math.round((currentMinutes / maxMinutes) * 100);
    const remainingMinutes = maxMinutes - currentMinutes;

    await this.resend.emails.send({
      from: 'Voice Matrix <notifications@voicematrix.ai>',
      to: user.email,
      subject: level === 'critical' 
        ? '🚨 Critical: Usage Limit Almost Reached' 
        : '⚠️ Usage Warning: Approaching Monthly Limit',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.full_name || 'there'},</h2>
          
          <p>You've used <strong>${percentage}%</strong> of your monthly minutes.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Current Usage:</strong> ${currentMinutes} minutes</p>
            <p style="margin: 5px 0;"><strong>Monthly Limit:</strong> ${maxMinutes} minutes</p>
            <p style="margin: 5px 0;"><strong>Remaining:</strong> ${remainingMinutes} minutes</p>
          </div>
          
          ${level === 'critical' ? `
            <p style="color: #dc2626;"><strong>⚠️ Important:</strong> When you reach your limit, 
            your AI assistants will be temporarily disabled until your next billing cycle or upgrade.</p>
          ` : ''}
          
          <p>To ensure uninterrupted service, consider upgrading to Pro for 100 minutes monthly.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/settings/subscription" 
               style="background: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Upgrade to Pro
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Need help? Reply to this email or visit our support center.
          </p>
        </div>
      `
    });
  }

  /**
   * Send subscription change confirmation
   */
  async sendSubscriptionChangeEmail(
    userId: string,
    oldPlan: string,
    newPlan: string
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!user || !this.resend) return;

    const isUpgrade = newPlan === 'pro' && oldPlan === 'free';

    await this.resend.emails.send({
      from: 'Voice Matrix <notifications@voicematrix.ai>',
      to: user.email,
      subject: isUpgrade 
        ? '🎉 Welcome to Voice Matrix Pro!' 
        : 'Subscription Updated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.full_name || 'there'},</h2>
          
          ${isUpgrade ? `
            <p>🎉 Congratulations! You've upgraded to Voice Matrix Pro.</p>
            
            <h3>Your Pro benefits:</h3>
            <ul>
              <li>✅ 10 AI Assistants (was 1)</li>
              <li>✅ 100 minutes monthly (was 10)</li>
              <li>✅ Priority support</li>
              <li>✅ Advanced analytics</li>
            </ul>
            
            <p>Your usage limits have been reset and all assistants have been re-enabled.</p>
          ` : `
            <p>Your subscription has been updated to the ${newPlan} plan.</p>
            
            <p><strong>Important:</strong> As part of the downgrade, we've kept your most 
            recent assistant and removed the others to match your new plan limits.</p>
          `}
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What's next?</h3>
            <p>• Your new limits are active immediately</p>
            <p>• Usage resets on the 1st of each month</p>
            <p>• You can change plans anytime</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" 
               style="background: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Questions? Reply to this email or check our FAQ.
          </p>
        </div>
      `
    });
  }

  /**
   * Send cancellation confirmation
   */
  async sendCancellationEmail(userId: string): Promise<void> {
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name, billing_cycle_end')
      .eq('id', userId)
      .single();

    if (!user || !this.resend) return;

    const endDate = new Date(user.billing_cycle_end).toLocaleDateString();

    await this.resend.emails.send({
      from: 'Voice Matrix <notifications@voicematrix.ai>',
      to: user.email,
      subject: 'Subscription Cancelled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.full_name || 'there'},</h2>
          
          <p>We're sorry to see you go! Your Pro subscription has been cancelled.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Important information:</strong></p>
            <ul>
              <li>You'll keep Pro features until ${endDate}</li>
              <li>After that, you'll be on the Free plan</li>
              <li>Your data and assistants will be preserved</li>
              <li>You can reactivate anytime</li>
            </ul>
          </div>
          
          <p>We'd love to hear your feedback. What could we do better?</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/feedback" 
               style="background: #6b7280; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Share Feedback
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Changed your mind? You can reactivate your subscription anytime from your settings.
          </p>
        </div>
      `
    });
  }

  /**
   * Send monthly usage reset notification
   */
  async sendMonthlyResetEmail(userId: string): Promise<void> {
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name, subscription_type, max_minutes_monthly')
      .eq('id', userId)
      .single();

    if (!user || !this.resend) return;

    await this.resend.emails.send({
      from: 'Voice Matrix <notifications@voicematrix.ai>',
      to: user.email,
      subject: '📊 Your Monthly Usage Has Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.full_name || 'there'},</h2>
          
          <p>Great news! Your monthly usage has been reset.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Your ${user.subscription_type === 'pro' ? 'Pro' : 'Free'} Plan includes:</h3>
            <p>• <strong>${user.max_minutes_monthly} minutes</strong> for this month</p>
            <p>• <strong>${user.subscription_type === 'pro' ? '10' : '1'} AI assistants</strong></p>
            <p>• All assistants have been re-enabled</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" 
               style="background: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Tip: Monitor your usage in real-time from your dashboard.
          </p>
        </div>
      `
    });
  }

  /**
   * Send limit exceeded notification (when assistants are disabled)
   */
  async sendLimitExceededEmail(userId: string): Promise<void> {
    const { data: user } = await this.supabase
      .from('profiles')
      .select('email, full_name, subscription_type, billing_cycle_end')
      .eq('id', userId)
      .single();

    if (!user || !this.resend) return;

    const resetDate = new Date(user.billing_cycle_end).toLocaleDateString();

    await this.resend.emails.send({
      from: 'Voice Matrix <notifications@voicematrix.ai>',
      to: user.email,
      subject: '🛑 Usage Limit Reached - Assistants Disabled',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${user.full_name || 'there'},</h2>
          
          <p style="color: #dc2626;"><strong>Your monthly usage limit has been reached.</strong></p>
          
          <p>To prevent additional charges, we've temporarily disabled your AI assistants. 
          They will automatically reactivate on ${resetDate} or when you upgrade.</p>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; 
                      border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">What this means:</h3>
            <ul>
              <li>Assistants cannot receive new calls</li>
              <li>Existing call data is preserved</li>
              <li>Phone numbers remain assigned</li>
            </ul>
          </div>
          
          <h3>Your options:</h3>
          <p>1. <strong>Wait until ${resetDate}</strong> for automatic reset</p>
          <p>2. <strong>Upgrade to Pro</strong> for immediate access + 100 minutes monthly</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/settings/subscription" 
               style="background: #dc2626; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Upgrade Now
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Need help? Our support team is here to assist you.
          </p>
        </div>
      `
    });
  }
}