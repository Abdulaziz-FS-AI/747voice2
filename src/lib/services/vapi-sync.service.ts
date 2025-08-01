import { createServiceRoleClient } from '@/lib/supabase';
import { VapiClient } from '@vapi-ai/server-sdk';
import { VapiSyncJob } from '@/lib/types/subscription.types';

export class VapiSyncService {
  private supabase = createServiceRoleClient();
  private vapiClient: VapiClient | null = null;
  private isProcessing = false;

  constructor() {
    if (process.env.VAPI_API_KEY) {
      this.vapiClient = new VapiClient({ apiKey: process.env.VAPI_API_KEY });
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
    if (this.isProcessing || !this.vapiClient) return;

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
          success = await this.disableAssistant(job.vapiAssistantId, job.reason);
          break;
        case 'enable':
          success = await this.enableAssistant(job.vapiAssistantId);
          break;
        case 'delete':
          success = await this.deleteAssistant(job.vapiAssistantId);
          break;
        case 'update':
          success = await this.updateAssistant(job.vapiAssistantId, job.reason);
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
    if (!this.vapiClient) return false;

    try {
      // Get current assistant configuration
      const assistant = await this.vapiClient.assistants.get(vapiAssistantId);
      
      if (!assistant) {
        console.error('Assistant not found:', vapiAssistantId);
        return false;
      }

      // Update assistant to disconnect phone numbers and set limit message
      const limitMessage = reason === 'usage_limit_exceeded' 
        ? "I apologize, but your account has reached its usage limit for this month. Please upgrade your subscription to continue using this service."
        : "This service is temporarily unavailable. Please contact support for assistance.";

      await this.vapiClient.assistants.update(vapiAssistantId, {
        phoneNumberId: null, // Disconnect phone number
        firstMessage: limitMessage,
        systemPrompt: `IMPORTANT: This assistant is disabled due to: ${reason}. Inform the user: "${limitMessage}" and end the call politely.`,
        maxDurationSeconds: 30 // Short timeout
      });

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
    if (!this.vapiClient) return false;

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
      await this.vapiClient.assistants.update(vapiAssistantId, {
        phoneNumberId: assistant.phone_number_id,
        firstMessage: assistant.config.first_message,
        systemPrompt: assistant.config.system_prompt,
        maxDurationSeconds: assistant.config.max_call_duration
      });

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
    if (!this.vapiClient) return false;

    try {
      await this.vapiClient.assistants.delete(vapiAssistantId);
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
    if (!this.vapiClient) return false;

    try {
      // Parse update data (JSON string)
      const updates = JSON.parse(updateData);
      await this.vapiClient.assistants.update(vapiAssistantId, updates);
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