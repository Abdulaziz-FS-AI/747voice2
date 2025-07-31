import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { VAPIService } from '@/lib/services/vapi.service'

/**
 * GET /api/cron/sync
 * Periodic sync job - can be called by Vercel Cron or external scheduler
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()
    const vapiService = VAPIService.getInstance()
    
    const syncResults = {
      totalUsers: 0,
      syncedUsers: 0,
      totalAssistantsRemoved: 0,
      totalPhoneNumbersRemoved: 0,
      errors: [] as Array<{ userId: string, error: string }>
    }

    // Get all active users
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('onboarding_completed', true)

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to sync',
        results: syncResults
      })
    }

    syncResults.totalUsers = users.length

    // Process each user
    for (const user of users) {
      try {
        // Sync assistants for this user
        const { data: assistants } = await supabase
          .from('user_assistants')
          .select('id, vapi_assistant_id, name')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (assistants && assistants.length > 0) {
          const vapiAssistants = await vapiService.getAssistants()
          const vapiIds = new Set(vapiAssistants.map(a => a.id))

          for (const assistant of assistants) {
            if (!vapiIds.has(assistant.vapi_assistant_id)) {
              // Mark as deleted
              await supabase
                .from('user_assistants')
                .update({ 
                  is_active: false,
                  sync_status: 'deleted',
                  last_synced_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', assistant.id)

              syncResults.totalAssistantsRemoved++

              // Log sync event
              await supabase.rpc('log_sync_event', {
                p_user_id: user.id,
                p_event_type: 'scheduled_sync',
                p_resource_type: 'assistant',
                p_resource_id: assistant.id,
                p_action: 'deleted',
                p_details: { reason: 'Not found in VAPI', name: assistant.name }
              })
            }
          }
        }

        // Sync phone numbers for this user
        const { data: phoneNumbers } = await supabase
          .from('user_phone_numbers')
          .select('id, vapi_phone_id, phone_number')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (phoneNumbers && phoneNumbers.length > 0) {
          for (const phone of phoneNumbers) {
            try {
              const response = await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
                headers: {
                  'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
                }
              })

              if (response.status === 404) {
                // Mark as deleted
                await supabase
                  .from('user_phone_numbers')
                  .update({ 
                    is_active: false,
                    sync_status: 'deleted',
                    last_synced_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', phone.id)

                syncResults.totalPhoneNumbersRemoved++

                // Log sync event
                await supabase.rpc('log_sync_event', {
                  p_user_id: user.id,
                  p_event_type: 'scheduled_sync',
                  p_resource_type: 'phone_number',
                  p_resource_id: phone.id,
                  p_action: 'deleted',
                  p_details: { reason: 'Not found in VAPI', number: phone.phone_number }
                })
              }
            } catch (error) {
              console.error(`Error checking phone ${phone.id}:`, error)
            }
          }
        }

        syncResults.syncedUsers++
      } catch (error) {
        console.error(`Error syncing user ${user.id}:`, error)
        syncResults.errors.push({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('Cron sync completed:', syncResults)

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      results: syncResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}