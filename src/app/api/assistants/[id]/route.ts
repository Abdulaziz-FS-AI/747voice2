import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requirePermission } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { vapiClient } from '@/lib/vapi'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient('get_assistant')

    const { data: assistant, error } = await supabase
      .from('user_assistants')
      .select('*, assistant_questions(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: assistant
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await requirePermission()
    const body = await request.json()
    const supabase = createServiceRoleClient('update_assistant')

    // Verify ownership
    const { data: existing } = await supabase
      .from('user_assistants')
      .select('id, vapi_assistant_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    // Update in database
    const { data: assistant, error } = await supabase
      .from('user_assistants')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: assistant
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const { user } = await requirePermission()
    const supabase = createServiceRoleClient('delete_assistant')

    console.log(`Delete assistant request: ${params.id} for user: ${user.id}`)

    // Get assistant details and assigned phone numbers
    const { data: assistant } = await supabase
      .from('user_assistants')
      .select('id, name, vapi_assistant_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      console.log(`Assistant ${params.id} not found for user ${user.id}`)
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    console.log(`Found assistant: ${assistant.name} (${assistant.id})`)

    // Get phone numbers assigned to this assistant
    const { data: assignedPhones, error: phonesError } = await supabase
      .from('user_phone_numbers')
      .select('id, phone_number, friendly_name, vapi_phone_id')
      .eq('assigned_assistant_id', assistant.id)

    if (phonesError) {
      console.error('Error fetching assigned phone numbers:', phonesError)
    } else if (assignedPhones && assignedPhones.length > 0) {
      console.log(`Found ${assignedPhones.length} phone numbers assigned to assistant ${assistant.name}`)
    }

    // Delete from VAPI first (both assistant and its phone numbers)
    const deletionResults = {
      assistant: { success: false, error: null as any },
      phoneNumbers: [] as Array<{ id: string, number: string, success: boolean, error: any }>
    }

    // Delete assistant from VAPI
    console.log(`🔧 VAPI deletion check:`, {
      hasVapiId: !!assistant.vapi_assistant_id,
      vapiId: assistant.vapi_assistant_id,
      hasVapiClient: !!vapiClient,
      vapiApiKey: !!process.env.VAPI_API_KEY
    })

    if (assistant.vapi_assistant_id && vapiClient) {
      // Skip deletion for fallback IDs
      if (assistant.vapi_assistant_id.startsWith('fallback_')) {
        console.log(`⏭️ Skipping VAPI deletion for fallback ID: ${assistant.vapi_assistant_id}`)
        deletionResults.assistant.success = true
        deletionResults.assistant.error = 'Fallback ID - no VAPI deletion needed'
      } else {
        try {
          console.log(`🗑️ Deleting assistant ${assistant.vapi_assistant_id} from VAPI...`)
          const result = await vapiClient.deleteAssistant(assistant.vapi_assistant_id)
          console.log(`✅ VAPI delete result:`, result)
          deletionResults.assistant.success = true
          console.log(`✅ Successfully deleted assistant from VAPI`)
        } catch (vapiError: any) {
          console.error('❌ Failed to delete assistant from VAPI:', {
            error: vapiError,
            message: vapiError?.message,
            status: vapiError?.status,
            response: vapiError?.response?.data
          })
          deletionResults.assistant.error = vapiError
          // Continue with local deletion even if VAPI fails
        }
      }
    } else {
      console.log(`⚠️ No VAPI deletion needed:`, {
        reason: !assistant.vapi_assistant_id ? 'No VAPI ID' : 'No VAPI client'
      })
      deletionResults.assistant.success = true
      deletionResults.assistant.error = 'No VAPI integration'
    }

    // Delete assigned phone numbers from VAPI
    if (assignedPhones && assignedPhones.length > 0) {
      console.log(`📞 Found ${assignedPhones.length} phone numbers to delete from VAPI`)
      for (const phone of assignedPhones) {
        try {
          console.log(`📞 Deleting phone number ${phone.phone_number} (${phone.vapi_phone_id}) from VAPI...`)
          
          const response = await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
            }
          })

          console.log(`📞 Phone delete response: ${response.status} ${response.statusText}`)

          if (response.ok || response.status === 404) {
            // 404 means already deleted, which is fine
            deletionResults.phoneNumbers.push({
              id: phone.id,
              number: phone.phone_number,
              success: true,
              error: null
            })
            console.log(`✅ Successfully deleted phone number ${phone.phone_number} from VAPI`)
          } else {
            const errorText = await response.text()
            console.error(`❌ Phone delete failed: ${response.status} - ${errorText}`)
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }
        } catch (vapiError: any) {
          console.error(`❌ Failed to delete phone number ${phone.phone_number} from VAPI:`, vapiError)
          deletionResults.phoneNumbers.push({
            id: phone.id,
            number: phone.phone_number,
            success: false,
            error: vapiError?.message || vapiError
          })
          // Continue with next phone number
        }
      }
    } else {
      console.log(`📞 No phone numbers assigned to this assistant`)
    }

    // Soft delete phone numbers in database (preserve call history)
    if (assignedPhones && assignedPhones.length > 0) {
      console.log(`Soft deleting ${assignedPhones.length} assigned phone numbers`)
      const { error: phoneDeleteError } = await supabase
        .from('user_phone_numbers')
        .update({
          assigned_assistant_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('assigned_assistant_id', assistant.id)

      if (phoneDeleteError) {
        console.error('Error soft deleting phone numbers:', phoneDeleteError)
      } else {
        console.log(`Successfully soft deleted phone numbers`)
      }
    }

    // For demo system: Mark as deleted instead of hard delete
    // This preserves history while making it unavailable
    console.log(`Marking assistant ${assistant.name} as deleted in database`)
    const { error: assistantDeleteError } = await supabase
      .from('user_assistants')
      .update({
        assistant_state: 'deleted',
        deletion_reason: 'manual',
        deleted_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (assistantDeleteError) {
      console.error('Error deleting assistant from database:', assistantDeleteError)
      throw assistantDeleteError
    }

    console.log(`Successfully deleted assistant ${assistant.name} and ${assignedPhones?.length || 0} phone numbers`)

    // Build response message
    let message = `Assistant "${assistant.name}" deleted successfully`
    if (assignedPhones && assignedPhones.length > 0) {
      const successfulPhoneDeletes = deletionResults.phoneNumbers.filter(p => p.success).length
      message += ` along with ${successfulPhoneDeletes} assigned phone numbers`
    }

    return NextResponse.json({
      success: true,
      message,
      details: {
        assistant: deletionResults.assistant,
        phoneNumbers: deletionResults.phoneNumbers,
        totalPhoneNumbers: assignedPhones?.length || 0
      }
    })

  } catch (error) {
    console.error('DELETE assistant error:', error)
    return handleAPIError(error)
  }
}