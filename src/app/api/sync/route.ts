import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { VAPIService } from '@/lib/services/vapi.service'

/**
 * POST /api/sync
 * Comprehensive sync with VAPI - handles deletions, updates, and reconciliation
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()
    const vapiService = VAPIService.getInstance()

    const results = {
      assistants: { 
        checked: 0, 
        removed: 0, 
        errors: 0,
        details: [] as Array<{ id: string, name: string, action: string }>
      },
      phoneNumbers: { 
        checked: 0, 
        removed: 0, 
        errors: 0,
        details: [] as Array<{ id: string, number: string, action: string }>
      }
    }

    // Sync Assistants
    console.log('Starting assistant sync for user:', user.id)
    
    const { data: localAssistants } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (localAssistants && localAssistants.length > 0) {
      results.assistants.checked = localAssistants.length
      
      try {
        // Get all VAPI assistants
        const vapiAssistants = await vapiService.getAssistants()
        const vapiIds = new Set(vapiAssistants.map(a => a.id))
        
        console.log(`Found ${vapiAssistants.length} assistants in VAPI`)

        // Process each local assistant
        for (const assistant of localAssistants) {
          if (!vapiIds.has(assistant.vapi_assistant_id)) {
            // Assistant doesn't exist in VAPI anymore
            console.log(`Assistant ${assistant.name} (${assistant.vapi_assistant_id}) not found in VAPI`)
            
            // Soft delete the assistant
            const { error } = await supabase
              .from('user_assistants')
              .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', assistant.id)
            
            if (!error) {
              results.assistants.removed++
              results.assistants.details.push({
                id: assistant.id,
                name: assistant.name,
                action: 'removed - not found in VAPI'
              })
              
              // Also remove any phone number assignments
              await supabase
                .from('user_phone_numbers')
                .update({ 
                  assigned_assistant_id: null,
                  assigned_at: null,
                  updated_at: new Date().toISOString()
                })
                .eq('assigned_assistant_id', assistant.id)
            } else {
              results.assistants.errors++
              console.error('Error soft deleting assistant:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching VAPI assistants:', error)
        results.assistants.errors++
      }
    }

    // Sync Phone Numbers
    console.log('Starting phone number sync for user:', user.id)
    
    const { data: localPhones } = await supabase
      .from('user_phone_numbers')  
      .select('id, vapi_phone_id, phone_number, friendly_name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (localPhones && localPhones.length > 0) {
      results.phoneNumbers.checked = localPhones.length

      // Check each phone number individually
      const checkPromises = localPhones.map(async (phone) => {
        try {
          const response = await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
            }
          })

          if (response.status === 404) {
            // Phone number doesn't exist in VAPI
            console.log(`Phone ${phone.phone_number} (${phone.vapi_phone_id}) not found in VAPI`)
            
            const { error } = await supabase
              .from('user_phone_numbers')
              .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', phone.id)
            
            if (!error) {
              results.phoneNumbers.removed++
              results.phoneNumbers.details.push({
                id: phone.id,
                number: phone.phone_number,
                action: 'removed - not found in VAPI'
              })
            } else {
              results.phoneNumbers.errors++
              console.error('Error soft deleting phone number:', error)
            }
          } else if (!response.ok && response.status !== 404) {
            // Other error - log but don't delete
            console.error(`Error checking phone ${phone.id}: ${response.status}`)
            results.phoneNumbers.errors++
          }
        } catch (error) {
          // Network error - don't delete, just log
          console.error(`Network error checking phone ${phone.id}:`, error)
          results.phoneNumbers.errors++
        }
      })

      // Wait for all phone checks to complete
      await Promise.all(checkPromises)
    }

    // Add sync metadata to audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'sync_with_vapi',
        resource_type: 'sync',
        new_values: results,
        created_at: new Date().toISOString()
      })

    const summary = `Sync complete. Assistants: ${results.assistants.removed} removed (${results.assistants.checked} checked). ` +
                    `Phone numbers: ${results.phoneNumbers.removed} removed (${results.phoneNumbers.checked} checked).`

    return NextResponse.json({
      success: true,
      data: results,
      message: summary
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'SYNC_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to sync with VAPI' 
      }
    }, { status: 500 })
  }
}

/**
 * GET /api/sync/status
 * Get the last sync status
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    // Get the last sync from audit logs
    const { data: lastSync } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('action', 'sync_with_vapi')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        lastSync: lastSync?.created_at || null,
        results: lastSync?.new_values || null
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { code: 'STATUS_ERROR', message: 'Failed to get sync status' }
    }, { status: 500 })
  }
}