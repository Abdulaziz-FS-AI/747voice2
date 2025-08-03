import { createServiceRoleClient } from '@/lib/supabase';

export class VapiTimeoutService {
  private supabase = createServiceRoleClient();
  private vapiApiKey: string;
  private vapiBaseUrl = 'https://api.vapi.ai';

  constructor() {
    if (!process.env.VAPI_API_KEY) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }
    this.vapiApiKey = process.env.VAPI_API_KEY;
  }

  /**
   * Update assistant max duration via VAPI API
   */
  private async updateVapiAssistantDuration(
    vapiAssistantId: string, 
    maxDurationSeconds: number
  ): Promise<void> {
    const url = `${this.vapiBaseUrl}/assistant/${vapiAssistantId}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: maxDurationSeconds
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VAPI API error (${response.status}): ${errorText}`);
    }

    console.log(`✅ Updated VAPI assistant ${vapiAssistantId} max duration to ${maxDurationSeconds}s`);
  }

  /**
   * Enforce usage limits by reducing call timeout to 10 seconds
   */
  async enforceUsageLimits(userId: string): Promise<void> {
    console.log(`🚫 Enforcing usage limits for user: ${userId}`);

    // Get all user assistants that aren't already usage-limited
    const { data: assistants, error } = await this.supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, original_max_duration, config')
      .eq('user_id', userId)
      .eq('is_usage_limited', false);

    if (error) {
      console.error('Error fetching assistants for usage limit enforcement:', error);
      throw error;
    }

    if (!assistants || assistants.length === 0) {
      console.log('No assistants found to limit');
      return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each assistant
    for (const assistant of assistants) {
      try {
        // Store original max duration if not already stored
        const originalDuration = assistant.original_max_duration || 
          (assistant.config as any)?.max_call_duration || 300;

        // Update VAPI to 10 seconds
        await this.updateVapiAssistantDuration(assistant.vapi_assistant_id, 10);

        // Update local database
        const { error: updateError } = await this.supabase
          .from('user_assistants')
          .update({
            original_max_duration: originalDuration,
            current_max_duration: 10,
            is_usage_limited: true,
            usage_limited_at: new Date().toISOString()
          })
          .eq('id', assistant.id);

        if (updateError) {
          throw updateError;
        }

        results.success++;
        console.log(`✅ Limited assistant ${assistant.id} to 10 seconds`);

      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to limit assistant ${assistant.id}: ${error}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`🚫 Usage limit enforcement completed: ${results.success} success, ${results.failed} failed`);
    
    if (results.failed > 0) {
      console.error('Enforcement errors:', results.errors);
    }
  }

  /**
   * Restore original timeout limits (called on monthly reset)
   */
  async restoreOriginalLimits(userId: string): Promise<void> {
    console.log(`🔄 Restoring original limits for user: ${userId}`);

    // Get all usage-limited assistants
    const { data: assistants, error } = await this.supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, original_max_duration')
      .eq('user_id', userId)
      .eq('is_usage_limited', true);

    if (error) {
      console.error('Error fetching assistants for limit restoration:', error);
      throw error;
    }

    if (!assistants || assistants.length === 0) {
      console.log('No assistants found to restore');
      return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each assistant
    for (const assistant of assistants) {
      try {
        const originalDuration = assistant.original_max_duration || 300;

        // Update VAPI back to original duration
        await this.updateVapiAssistantDuration(assistant.vapi_assistant_id, originalDuration);

        // Update local database
        const { error: updateError } = await this.supabase
          .from('user_assistants')
          .update({
            current_max_duration: originalDuration,
            is_usage_limited: false,
            usage_limited_at: null
          })
          .eq('id', assistant.id);

        if (updateError) {
          throw updateError;
        }

        results.success++;
        console.log(`✅ Restored assistant ${assistant.id} to ${originalDuration} seconds`);

      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to restore assistant ${assistant.id}: ${error}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`🔄 Limit restoration completed: ${results.success} success, ${results.failed} failed`);
    
    if (results.failed > 0) {
      console.error('Restoration errors:', results.errors);
    }
  }

  /**
   * Get usage limit status for a user
   */
  async getUsageLimitStatus(userId: string): Promise<{
    totalAssistants: number;
    limitedAssistants: number;
    isLimited: boolean;
  }> {
    const { data: assistants, error } = await this.supabase
      .from('user_assistants')
      .select('is_usage_limited')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const totalAssistants = assistants?.length || 0;
    const limitedAssistants = assistants?.filter(a => a.is_usage_limited).length || 0;

    return {
      totalAssistants,
      limitedAssistants,
      isLimited: limitedAssistants > 0
    };
  }
}