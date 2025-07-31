import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { VAPIService } from '@/lib/services/vapi.service'

/**
 * POST /api/sync
 * Sync local data with VAPI to remove stale records
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()
    const vapiService = VAPIService.getInstance()

    const results = {
      assistants: { checked: 0, removed: 0 },
      phoneNumbers: { checked: 0, removed: 0 }
    }

    // Sync Assistants
    const { data: localAssistants } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (localAssistants) {
      results.assistants.checked = localAssistants.length
      
      // Get all VAPI assistants
      const vapiAssistants = await vapiService.getAssistants()
      const vapiIds = new Set(vapiAssistants.map(a => a.id))

      // Find assistants that exist locally but not in VAPI
      const staleAssistants = localAssistants.filter(
        assistant => !vapiIds.has(assistant.vapi_assistant_id)
      )

      // Soft delete stale assistants
      for (const staleAssistant of staleAssistants) {
        await supabase
          .from('user_assistants')
          .update({ is_active: false })
          .eq('id', staleAssistant.id)
        
        results.assistants.removed++
      }
    }

    // Sync Phone Numbers
    const { data: localPhones } = await supabase
      .from('user_phone_numbers')  
      .select('id, vapi_phone_id, friendly_name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (localPhones) {
      results.phoneNumbers.checked = localPhones.length

      // Check each phone number exists in VAPI
      for (const phone of localPhones) {
        try {
          // Try to get the phone number from VAPI
          await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
            }
          }).then(res => {
            if (res.status === 404) {
              // Phone number doesn't exist in VAPI, soft delete it
              supabase
                .from('user_phone_numbers')
                .update({ is_active: false })
                .eq('id', phone.id)
              
              results.phoneNumbers.removed++
            }
          })
        } catch (error) {
          // If we can't check, leave it alone
          console.error(`Could not verify phone ${phone.id}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Sync complete. Removed ${results.assistants.removed} assistants and ${results.phoneNumbers.removed} phone numbers.`
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'SYNC_ERROR', message: 'Failed to sync with VAPI' }
    }, { status: 500 })
  }
}