import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { VapiClient } from '@/lib/vapi'
import { 
  validateResourceEvent, 
  isAssistantDeletedEvent, 
  isPhoneNumberDeletedEvent,
  type ResourceEvent 
} from '@/types/vapi-resource-events'

/**
 * POST /api/webhooks/vapi/resource
 * Handle VAPI resource lifecycle events (create, update, delete)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-vapi-signature') || ''
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET

    // Verify webhook signature
    if (webhookSecret && !VapiClient.verifyWebhookSignature(body, signature, webhookSecret)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' }
      }, { status: 401 })
    }

    const event = validateResourceEvent(JSON.parse(body))
    if (!event) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_EVENT', message: 'Invalid resource event format' }
      }, { status: 400 })
    }

    console.log('Received VAPI resource event:', event.type, event.resourceId)

    const supabase = createServiceRoleClient()

    // Handle deletion events
    if (isAssistantDeletedEvent(event)) {
      await handleAssistantDeletion(supabase, event.assistantId)
    } else if (isPhoneNumberDeletedEvent(event)) {
      await handlePhoneNumberDeletion(supabase, event.phoneNumberId)
    }

    return NextResponse.json({
      success: true,
      message: 'Resource event processed successfully'
    })
  } catch (error) {
    console.error('Resource webhook error:', error)
    return NextResponse.json({
      success: false,
      error: { code: 'PROCESSING_ERROR', message: 'Failed to process resource event' }
    }, { status: 500 })
  }
}

async function handleAssistantDeletion(supabase: ReturnType<typeof createServiceRoleClient>, vapiAssistantId: string) {
  console.log('Processing assistant deletion:', vapiAssistantId)
  
  // Find and soft delete the assistant
  const { data: assistant } = await supabase
    .from('user_assistants')
    .select('id, name')
    .eq('vapi_assistant_id', vapiAssistantId)
    .eq('is_active', true)
    .single()

  if (assistant) {
    // Soft delete the assistant
    const { error: deleteError } = await supabase
      .from('user_assistants')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', assistant.id)

    if (!deleteError) {
      console.log(`Assistant ${assistant.name} (${assistant.id}) marked as deleted`)
      
      // Remove assistant assignments from phone numbers
      await supabase
        .from('user_phone_numbers')
        .update({ 
          assigned_assistant_id: null,
          assigned_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('assigned_assistant_id', assistant.id)
    }
  }
}

async function handlePhoneNumberDeletion(supabase: ReturnType<typeof createServiceRoleClient>, vapiPhoneId: string) {
  console.log('Processing phone number deletion:', vapiPhoneId)
  
  // Find and soft delete the phone number
  const { data: phoneNumber } = await supabase
    .from('user_phone_numbers')
    .select('id, phone_number')
    .eq('vapi_phone_id', vapiPhoneId)
    .eq('is_active', true)
    .single()

  if (phoneNumber) {
    const { error: deleteError } = await supabase
      .from('user_phone_numbers')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', phoneNumber.id)

    if (!deleteError) {
      console.log(`Phone number ${phoneNumber.phone_number} (${phoneNumber.id}) marked as deleted`)
    }
  }
}

// GET method for webhook verification
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'VAPI resource webhook endpoint is ready'
  })
}