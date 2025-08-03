import { createServiceRoleClient } from '@/lib/supabase';
import { VapiTimeoutService } from './vapi-timeout.service';

export class UsageEnforcementProcessor {
  private supabase = createServiceRoleClient();
  private vapiTimeoutService = new VapiTimeoutService();
  private isProcessing = false;

  /**
   * Process pending enforcement actions from the queue
   */
  async processEnforcementQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('Enforcement processor already running, skipping...');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 Starting enforcement queue processing...');

    try {
      // Get pending enforcement actions
      const { data: queueItems, error } = await this.supabase
        .from('usage_enforcement_queue')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(10); // Process in batches

      if (error) {
        console.error('Error fetching enforcement queue:', error);
        return;
      }

      if (!queueItems || queueItems.length === 0) {
        console.log('No pending enforcement actions');
        return;
      }

      console.log(`Processing ${queueItems.length} enforcement actions`);

      for (const item of queueItems) {
        await this.processQueueItem(item);
      }

    } catch (error) {
      console.error('Error processing enforcement queue:', error);
    } finally {
      this.isProcessing = false;
      console.log('✅ Enforcement queue processing completed');
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: any): Promise<void> {
    console.log(`Processing ${item.action} for user ${item.user_id}`);

    try {
      if (item.action === 'enforce_limits') {
        await this.vapiTimeoutService.enforceUsageLimits(item.user_id);
      } else if (item.action === 'restore_limits') {
        await this.vapiTimeoutService.restoreOriginalLimits(item.user_id);
      } else {
        throw new Error(`Unknown action: ${item.action}`);
      }

      // Mark as processed
      await this.supabase
        .from('usage_enforcement_queue')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', item.id);

      console.log(`✅ Successfully processed ${item.action} for user ${item.user_id}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to process ${item.action} for user ${item.user_id}:`, errorMessage);

      // Mark as failed with error message
      await this.supabase
        .from('usage_enforcement_queue')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', item.id);
    }
  }

  /**
   * Start the enforcement processor (called periodically)
   */
  static async startProcessor(): Promise<void> {
    const processor = new UsageEnforcementProcessor();
    await processor.processEnforcementQueue();
  }

  /**
   * Get queue status for monitoring
   */
  async getQueueStatus(): Promise<{
    pending: number;
    processed: number;
    failed: number;
  }> {
    const { data: pending } = await this.supabase
      .from('usage_enforcement_queue')
      .select('id', { count: 'exact' })
      .eq('processed', false);

    const { data: processed } = await this.supabase
      .from('usage_enforcement_queue')
      .select('id', { count: 'exact' })
      .eq('processed', true)
      .is('error_message', null);

    const { data: failed } = await this.supabase
      .from('usage_enforcement_queue')
      .select('id', { count: 'exact' })
      .eq('processed', true)
      .not('error_message', 'is', null);

    return {
      pending: pending?.length || 0,
      processed: processed?.length || 0,
      failed: failed?.length || 0
    };
  }
}