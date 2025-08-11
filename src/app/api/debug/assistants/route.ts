import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

/**
 * Debug endpoint to check assistant states and IDs
 * GET /api/debug/assistants
 */
export async function GET() {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient('debug_assistants')

    console.log('🔍 [DEBUG] Fetching all assistants for user:', user.id)

    // Get all assistants for this user with all fields
    const { data: assistants, error } = await supabase
      .from('user_assistants')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('🔍 [DEBUG] Query error:', error)
      throw error
    }

    console.log('🔍 [DEBUG] Found assistants:', assistants?.length || 0)

    // Process assistants to show useful debug info
    const debugInfo = assistants?.map(assistant => ({
      id: assistant.id,
      name: assistant.name,
      vapi_assistant_id: assistant.vapi_assistant_id,
      assistant_state: assistant.assistant_state || 'MISSING_FIELD',
      has_assistant_state_field: assistant.hasOwnProperty('assistant_state'),
      created_at: assistant.created_at,
      is_fallback_id: assistant.vapi_assistant_id?.startsWith('fallback_') || false,
      // Check for other possible state fields
      is_active: assistant.is_active,
      is_disabled: assistant.is_disabled,
      deleted_at: assistant.deleted_at
    })) || []

    return NextResponse.json({
      success: true,
      user_id: user.id,
      total_assistants: assistants?.length || 0,
      assistants: debugInfo,
      schema_info: {
        expected_assistant_state_values: ['active', 'expired', 'deleted'],
        note: 'assistant_state should default to "active" for new assistants'
      }
    })

  } catch (error: any) {
    console.error('🔍 [DEBUG] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Debug query failed',
      details: error
    }, { status: 500 })
  }
}