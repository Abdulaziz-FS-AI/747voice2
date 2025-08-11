// Service to handle usage limit enforcement
import { createServiceRoleClient } from '@/lib/supabase'
import { vapiClient } from '@/lib/vapi'

export class UsageLimitService {
  /**
   * Calculate total usage minutes for a user from call_logs
   * Only counts calls from the current billing cycle (since signup anniversary)
   */
  static async calculateUserUsage(userId: string): Promise<{
    totalMinutes: number
    callCount: number
    cycleStartDate: Date
  }> {
    const supabase = createServiceRoleClient('usage_calculation')
    
    // Get user's signup date to calculate billing cycle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single()
    
    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError)
      throw new Error('User profile not found')
    }
    
    // Calculate current billing cycle start
    const cycleStart = this.calculateCycleStart(new Date(profile.created_at))
    
    // Sum all call durations since cycle start
    const { data: calls, error: callsError } = await supabase
      .from('call_logs')
      .select('duration_seconds, created_at')
      .eq('user_id', userId)
      .gte('created_at', cycleStart.toISOString())
      .order('created_at', { ascending: false })
    
    if (callsError) {
      console.error('Failed to get call logs:', callsError)
      throw new Error('Failed to calculate usage')
    }
    
    // Calculate total minutes (round up each call)
    const totalSeconds = calls?.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) || 0
    const totalMinutes = Math.ceil(totalSeconds / 60)
    
    console.log(`📊 User ${userId} usage: ${totalMinutes} minutes from ${calls?.length || 0} calls since ${cycleStart.toISOString()}`)
    
    return {
      totalMinutes,
      callCount: calls?.length || 0,
      cycleStartDate: cycleStart
    }
  }
  
  /**
   * Calculate the start date of the current billing cycle
   * Based on monthly anniversary of signup date
   */
  private static calculateCycleStart(signupDate: Date): Date {
    const now = new Date()
    const cycleStart = new Date(signupDate)
    
    // Set to current year and month
    cycleStart.setFullYear(now.getFullYear())
    cycleStart.setMonth(now.getMonth())
    
    // If the anniversary hasn't happened this month yet, go back one month
    if (cycleStart > now) {
      cycleStart.setMonth(cycleStart.getMonth() - 1)
    }
    
    return cycleStart
  }
  
  /**
   * Check if user has exceeded their 10-minute limit
   * This is called after each call ends
   */
  static async checkAndEnforceLimit(userId: string): Promise<boolean> {
    try {
      const usage = await this.calculateUserUsage(userId)
      
      if (usage.totalMinutes >= 10) {
        console.log(`🚨 User ${userId} has exceeded 10-minute limit with ${usage.totalMinutes} minutes`)
        
        // Check if we already enforced limits this cycle
        const supabase = createServiceRoleClient('limit_enforcement')
        const { data: profile } = await supabase
          .from('profiles')
          .select('limit_enforced_at')
          .eq('id', userId)
          .single()
        
        // Only enforce once per cycle
        if (!profile?.limit_enforced_at || new Date(profile.limit_enforced_at) < usage.cycleStartDate) {
          await this.enforceVapiLimits(userId)
          
          // Mark as enforced
          await supabase
            .from('profiles')
            .update({ limit_enforced_at: new Date().toISOString() })
            .eq('id', userId)
          
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Failed to check/enforce limits:', error)
      return false
    }
  }
  
  /**
   * Update all user's VAPI assistants to enforce 10-second limit
   */
  private static async enforceVapiLimits(userId: string): Promise<void> {
    const supabase = createServiceRoleClient('vapi_enforcement')
    
    // Get all user's active assistants with VAPI IDs
    const { data: assistants, error } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, config')
      .eq('user_id', userId)
      .eq('assistant_state', 'active')
      .not('vapi_assistant_id', 'is', null)
    
    if (error || !assistants) {
      console.error('Failed to get user assistants:', error)
      return
    }
    
    console.log(`📝 Enforcing limits on ${assistants.length} assistants for user ${userId}`)
    
    // Update each assistant in VAPI
    for (const assistant of assistants) {
      try {
        // Store original config if not already stored
        if (!assistant.config?.originalConfig) {
          await supabase
            .from('user_assistants')
            .update({
              config: {
                ...assistant.config,
                originalConfig: assistant.config || {}
              }
            })
            .eq('id', assistant.id)
        }
        
        // Update VAPI assistant with 10-second limit
        if (vapiClient) {
          await vapiClient.updateAssistant(assistant.vapi_assistant_id, {
            maxDurationSeconds: 10,
            firstMessage: "You've reached your monthly limit, so I have just 10 seconds to help you. What do you need?",
            model: {
              provider: 'openai',
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'IMPORTANT: User has reached their monthly usage limit. You must keep this call under 10 seconds. Be extremely brief and helpful. Start by quickly mentioning the limit.'
                }
              ],
              maxTokens: 50, // Limit response length
              temperature: 0.7
            },
            endCallAfterSpokenWords: {
              enabled: true,
              spokenWords: 30 // Force end after ~10 seconds of speech
            }
          })
          
          console.log(`✅ Updated VAPI assistant ${assistant.vapi_assistant_id} to 10-second limit`)
        } else {
          console.warn('VAPI client not available - cannot update assistant limits')
        }
        
        // Mark assistant as limit enforced locally
        await supabase
          .from('user_assistants')
          .update({
            config: {
              ...assistant.config,
              limitEnforced: true,
              limitMessage: 'Monthly limit reached - calls limited to 10 seconds'
            }
          })
          .eq('id', assistant.id)
          
      } catch (error) {
        console.error(`Failed to update assistant ${assistant.id}:`, error)
      }
    }
  }
  
  /**
   * Reset user limits at the start of a new billing cycle
   */
  static async resetUserLimits(userId: string): Promise<void> {
    const supabase = createServiceRoleClient('limit_reset')
    
    // Get assistants with enforced limits
    const { data: assistants } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, config')
      .eq('user_id', userId)
      .eq('config->limitEnforced', true)
    
    if (!assistants || assistants.length === 0) {
      return
    }
    
    console.log(`🔄 Resetting limits for ${assistants.length} assistants`)
    
    // Reset each assistant
    for (const assistant of assistants) {
      try {
        // Reset VAPI assistant to original config
        if (vapiClient && assistant.config?.originalConfig) {
          const originalConfig = assistant.config.originalConfig
          
          await vapiClient.updateAssistant(assistant.vapi_assistant_id, {
            maxDurationSeconds: originalConfig.maxDurationSeconds || 300, // Default 5 minutes
            firstMessage: originalConfig.firstMessage || "Hello! How can I help you today?",
            model: originalConfig.model || {
              provider: 'openai',
              model: 'gpt-4o-mini',
              maxTokens: 500,
              temperature: 0.7
            },
            endCallAfterSpokenWords: {
              enabled: false // Remove the limit
            }
          })
          
          console.log(`✅ Reset VAPI assistant ${assistant.vapi_assistant_id} to original config`)
        }
        
        // Reset local config
        const originalConfig = assistant.config?.originalConfig || {}
        await supabase
          .from('user_assistants')
          .update({
            config: {
              ...originalConfig,
              limitEnforced: false,
              originalConfig: originalConfig
            }
          })
          .eq('id', assistant.id)
          
      } catch (error) {
        console.error(`Failed to reset assistant ${assistant.id}:`, error)
      }
    }
    
    // Clear limit enforcement flag
    await supabase
      .from('profiles')
      .update({ limit_enforced_at: null })
      .eq('id', userId)
  }
}