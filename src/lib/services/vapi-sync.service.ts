import { createServiceRoleClient } from '@/lib/supabase';

// Simple sync job interface
interface VapiSyncJob {
  id: string;
  type: 'assistant' | 'phone_number';
  action: 'create' | 'update' | 'delete' | 'disable' | 'enable';
  entityId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  vapiAssistantId?: string;
  reason?: string;
  retryCount: number;
}

export class VapiSyncService {
  private supabase = createServiceRoleClient();
  private apiKey: string | null = null;
  private isProcessing = false;

  constructor() {
    if (process.env.VAPI_API_KEY) {
      this.apiKey = process.env.VAPI_API_KEY;
    }
  }

  /**
   * Queue a sync operation for later processing
   */
  async queueSync(
    assistantId: string,
    vapiAssistantId: string,
    action: 'disable' | 'enable' | 'delete' | 'update',
    reason: string,
    priority: number = 5
  ): Promise<void> {
    const { error } = await this.supabase
      .from('vapi_sync_queue')
      .insert({
        assistant_id: assistantId,
        vapi_assistant_id: vapiAssistantId,
        action,
        reason,
        priority,
        retry_count: 0
      });

    if (error) {
      console.error('Failed to queue VAPI sync:', error);
      throw error;
    }
  }

  /**
   * Process pending sync jobs
   */
  async processPendingJobs(limit: number = 10): Promise<void> {
    if (this.isProcessing || !this.apiKey) return;

    this.isProcessing = true;
    try {
      // Get pending jobs ordered by priority and created_at
      const { data: jobs } = await this.supabase
        .from('vapi_sync_queue')
        .select('*')
        .is('processed_at', null)
        .lt('retry_count', 3)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (!jobs || jobs.length === 0) return;

      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single sync job
   */
  private async processJob(job: VapiSyncJob): Promise<void> {
    try {
      let success = false;
      let error: string | undefined;

      switch (job.action) {
        case 'disable':
          if (job.vapiAssistantId) {
            success = await this.disableAssistant(job.vapiAssistantId, job.reason || 'No reason provided');
          }
          break;
        case 'enable':
          if (job.vapiAssistantId) {
            success = await this.enableAssistant(job.vapiAssistantId);
          }
          break;
        case 'delete':
          if (job.vapiAssistantId) {
            success = await this.deleteAssistant(job.vapiAssistantId);
          }
          break;
        case 'update':
          if (job.vapiAssistantId) {
            success = await this.updateAssistant(job.vapiAssistantId, job.reason || 'No reason provided');
          }
          break;
      }

      if (success) {
        // Mark as processed
        await this.supabase
          .from('vapi_sync_queue')
          .update({
            processed_at: new Date().toISOString(),
            error: null
          })
          .eq('id', job.id);
      } else {
        throw new Error(`Failed to ${job.action} assistant`);
      }
    } catch (err) {
      // Increment retry count and log error
      await this.supabase
        .from('vapi_sync_queue')
        .update({
          retry_count: job.retryCount + 1,
          error: err instanceof Error ? err.message : String(err),
          last_retry_at: new Date().toISOString()
        })
        .eq('id', job.id);

      console.error(`Failed to process sync job ${job.id}:`, err);
    }
  }

  /**
   * Disable assistant by disconnecting phone numbers
   */
  private async disableAssistant(vapiAssistantId: string, reason: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // TODO: Implement VAPI API call to disable assistant
      console.log(`Would disable assistant ${vapiAssistantId} for reason: ${reason}`);
      return true;
    } catch (error) {
      console.error('Failed to disable assistant:', error);
      return false;
    }
  }

  /**
   * Re-enable assistant by restoring original configuration
   */
  private async enableAssistant(vapiAssistantId: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // Get assistant's original configuration from our database
      const { data: assistant } = await this.supabase
        .from('user_assistants')
        .select('config, phone_number_id')
        .eq('vapi_assistant_id', vapiAssistantId)
        .single();

      if (!assistant || !assistant.config) {
        console.error('Assistant configuration not found');
        return false;
      }

      // Restore original configuration
      // TODO: Update assistant via VAPI API
      console.log(`Would re-enable assistant ${vapiAssistantId}`);

      return true;
    } catch (error) {
      console.error('Failed to enable assistant:', error);
      return false;
    }
  }

  /**
   * Delete assistant from VAPI
   */
  private async deleteAssistant(vapiAssistantId: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // TODO: Delete assistant via VAPI API
      console.log(`Would delete assistant ${vapiAssistantId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete assistant:', error);
      return false;
    }
  }

  /**
   * Update assistant configuration
   */
  private async updateAssistant(vapiAssistantId: string, updateData: string): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // Parse update data (JSON string)
      const updates = JSON.parse(updateData);
      // TODO: Update assistant via VAPI API
      console.log(`Would update assistant ${vapiAssistantId}`);
      return true;
    } catch (error) {
      console.error('Failed to update assistant:', error);
      return false;
    }
  }

  /**
   * Process all jobs for a specific user (used after subscription changes)
   */
  async processUserJobs(userId: string): Promise<void> {
    const { data: assistants } = await this.supabase
      .from('user_assistants')
      .select('id')
      .eq('user_id', userId);

    if (!assistants) return;

    const assistantIds = assistants.map(a => a.id);

    // Process all pending jobs for these assistants
    const { data: jobs } = await this.supabase
      .from('vapi_sync_queue')
      .select('*')
      .in('assistant_id', assistantIds)
      .is('processed_at', null);

    if (!jobs) return;

    for (const job of jobs) {
      await this.processJob(job);
    }
  }
}