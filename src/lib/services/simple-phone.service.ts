/**
 * Simplified Phone Number Service
 * Based on VAPI documentation: https://docs.vapi.ai/api-reference/phone-numbers/create
 */

import { createServiceRoleClient } from '@/lib/supabase'

export class SimplePhoneService {
  /**
   * Create a phone number with minimal complexity
   * VAPI Requirements:
   * - provider: 'twilio'
   * - twilioAccountSid & twilioAuthToken
   * - assistantId (VAPI assistant ID)
   * - number (E.164 format)
   */
  async createPhoneNumber(
    userId: string,
    phoneNumber: string,
    friendlyName: string,
    twilioAccountSid: string,
    twilioAuthToken: string,
    assistantId: string
  ) {
    console.log('📞 [SIMPLE PHONE] Starting phone number creation...')
    
    const supabase = createServiceRoleClient()
    
    // Step 1: Get the assistant and verify ownership
    console.log('📞 [SIMPLE PHONE] Fetching assistant:', assistantId)
    
    const { data: assistant, error: assistantError } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, name, assistant_state')
      .eq('id', assistantId)
      .eq('user_id', userId)
      .eq('assistant_state', 'active') // Only active assistants
      .single()
    
    if (assistantError || !assistant) {
      console.error('📞 [SIMPLE PHONE] Assistant not found:', {
        assistantId,
        userId,
        error: assistantError
      })
      throw new Error('Assistant not found or not active')
    }
    
    console.log('📞 [SIMPLE PHONE] Assistant found:', {
      id: assistant.id,
      name: assistant.name,
      vapiId: assistant.vapi_assistant_id
    })
    
    // Check if assistant has valid VAPI ID
    if (!assistant.vapi_assistant_id || assistant.vapi_assistant_id.startsWith('fallback_')) {
      throw new Error('Assistant does not have a valid VAPI integration. Please create a new assistant.')
    }
    
    // Step 2: Create phone number in VAPI
    console.log('📞 [SIMPLE PHONE] Creating VAPI phone number...')
    
    const vapiPayload = {
      provider: 'twilio',
      number: phoneNumber,
      twilioAccountSid: twilioAccountSid,
      twilioAuthToken: twilioAuthToken,
      name: friendlyName,
      assistantId: assistant.vapi_assistant_id // Use the VAPI ID, not our internal ID
    }
    
    console.log('📞 [SIMPLE PHONE] VAPI payload:', {
      ...vapiPayload,
      twilioAuthToken: '[REDACTED]'
    })
    
    const vapiResponse = await fetch('https://api.vapi.ai/phone-number', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vapiPayload)
    })
    
    if (!vapiResponse.ok) {
      const error = await vapiResponse.text()
      console.error('📞 [SIMPLE PHONE] VAPI error:', error)
      throw new Error(`VAPI error: ${error}`)
    }
    
    const vapiPhone = await vapiResponse.json()
    console.log('📞 [SIMPLE PHONE] VAPI phone created:', vapiPhone.id)
    
    // Step 3: Store in database
    console.log('📞 [SIMPLE PHONE] Storing in database...')
    
    const { data: dbPhone, error: dbError } = await supabase
      .from('user_phone_numbers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        friendly_name: friendlyName,
        provider: 'twilio',
        vapi_phone_id: vapiPhone.id,
        vapi_credential_id: vapiPhone.credentialId || null,
        assigned_assistant_id: assistant.id,
        is_active: true
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('📞 [SIMPLE PHONE] Database error:', dbError)
      
      // Try to clean up VAPI phone if database insert fails
      try {
        await fetch(`https://api.vapi.ai/phone-number/${vapiPhone.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          }
        })
      } catch (cleanupError) {
        console.error('📞 [SIMPLE PHONE] Cleanup failed:', cleanupError)
      }
      
      throw new Error(`Database error: ${dbError.message}`)
    }
    
    console.log('📞 [SIMPLE PHONE] ✅ Phone number created successfully!')
    
    return {
      ...dbPhone,
      assistant: {
        id: assistant.id,
        name: assistant.name
      }
    }
  }
  
  /**
   * Get all phone numbers for a user
   */
  async getUserPhoneNumbers(userId: string) {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select(`
        *,
        user_assistants!assigned_assistant_id (
          id,
          name,
          vapi_assistant_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch phone numbers: ${error.message}`)
    }
    
    return data || []
  }
  
  /**
   * Delete a phone number
   */
  async deletePhoneNumber(userId: string, phoneNumberId: string) {
    const supabase = createServiceRoleClient()
    
    // Get phone number to find VAPI ID
    const { data: phone, error: fetchError } = await supabase
      .from('user_phone_numbers')
      .select('vapi_phone_id')
      .eq('id', phoneNumberId)
      .eq('user_id', userId)
      .single()
    
    if (fetchError || !phone) {
      throw new Error('Phone number not found')
    }
    
    // Delete from VAPI first
    if (phone.vapi_phone_id) {
      try {
        await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          }
        })
      } catch (vapiError) {
        console.error('Failed to delete from VAPI:', vapiError)
      }
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_phone_numbers')
      .delete()
      .eq('id', phoneNumberId)
      .eq('user_id', userId)
    
    if (deleteError) {
      throw new Error(`Failed to delete phone number: ${deleteError.message}`)
    }
    
    return { success: true }
  }
}