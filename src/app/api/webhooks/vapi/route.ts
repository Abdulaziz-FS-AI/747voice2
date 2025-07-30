import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, VapiError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { VapiClient } from '@/lib/vapi';
import type { Database } from '@/types/database';
import { 
  validateWebhookEvent, 
  isCallEndEvent, 
  type WebhookEvent,
  type CallEndEvent
} from '@/types/vapi-webhooks';

// POST /api/webhooks/vapi - Handle Vapi webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-vapi-signature') || '';
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret && !VapiClient.verifyWebhookSignature(body, signature, webhookSecret)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      }, { status: 401 });
    }

    const parsedEvent = validateWebhookEvent(JSON.parse(body));
    if (!parsedEvent) {
      throw new VapiError('Invalid webhook event format', 400);
    }
    const event = parsedEvent;

    console.log('Received Vapi webhook event:', event.type, event.callId);

    const supabase = createServiceRoleClient();

    // Only handle call-end events for reports
    if (isCallEndEvent(event)) {
      await handleCallEnd(supabase, event);
    } else {
      console.log('Ignoring webhook event type:', event.type, '- Only processing call-end events');
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return handleAPIError(error);
  }
}


// Handle call end event - Create complete call report
async function handleCallEnd(supabase: ReturnType<typeof createServiceRoleClient>, event: CallEndEvent) {
  const { call } = event;

  // Find the assistant in our database
  const { data: assistant } = await supabase
    .from('user_assistants')
    .select('id')
    .eq('vapi_assistant_id', call.assistantId)
    .single();

  if (!assistant) {
    console.error('Assistant not found for Vapi ID:', call.assistantId);
    return;
  }

  // Check if call record already exists
  let callRecord;
  const { data: existingCall } = await supabase
    .from('calls')
    .select('*')
    .eq('vapi_call_id', call.id)
    .single();

  if (existingCall) {
    // Update existing call record
    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({
        status: call.status,
        ended_at: call.endedAt ? new Date(call.endedAt).toISOString() : new Date().toISOString(),
        duration: call.endedAt && call.startedAt ? 
          Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000) : 0,
        cost: call.cost || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCall.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating call record:', updateError);
      return;
    }
    callRecord = updatedCall;
  } else {
    // Create new call record (end-to-end report)
    const { data: newCall, error: insertError } = await supabase
      .from('calls')
      .insert({
        vapi_call_id: call.id,
        assistant_id: assistant.id,
        phone_number_id: event.phoneNumberId || null,
        caller_number: 'unknown',
        call_status: call.status,
        started_at: call.startedAt ? new Date(call.startedAt).toISOString() : new Date().toISOString(),
        ended_at: call.endedAt ? new Date(call.endedAt).toISOString() : new Date().toISOString(),
        duration_seconds: call.endedAt && call.startedAt ? 
          Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000) : 0,
        cost_cents: Math.round((call.cost || 0) * 100),
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating call record:', insertError);
      return;
    }
    callRecord = newCall;
  }

  // Process lead information if available
  if (call.analysis?.structuredData) {
    await createLeadFromCall(supabase, callRecord, call.analysis.structuredData);
  }

  // Store transcript if available
  if (call.transcript) {
    await storeTranscript(supabase, callRecord.id, call.transcript);
  }

  console.log('Call end report processed successfully:', call.id);
}


// Create lead from call analysis
async function createLeadFromCall(
  supabase: ReturnType<typeof createServiceRoleClient>,
  call: Database['public']['Tables']['calls']['Row'],
  structuredData: Record<string, unknown>
) {
  if (!structuredData) return;

  // Create lead record (removed team_id for single-user architecture)
  const { error } = await supabase
    .from('leads')
    .insert({
      call_id: call.id,
      user_id: call.user_id,
      first_name: typeof structuredData.firstName === 'string' ? structuredData.firstName : null,
      last_name: typeof structuredData.lastName === 'string' ? structuredData.lastName : null,
      email: typeof structuredData.email === 'string' ? structuredData.email : null,
      phone: typeof structuredData.phone === 'string' ? structuredData.phone : call.caller_number,
      lead_type: typeof structuredData.leadType === 'string' && ['buyer', 'seller', 'investor', 'renter'].includes(structuredData.leadType) ? structuredData.leadType as 'buyer' | 'seller' | 'investor' | 'renter' : null,
      lead_source: 'voice_call',
      status: 'new',
      property_type: Array.isArray(structuredData.propertyType) ? structuredData.propertyType as string[] : null,
      budget_min: typeof structuredData.budgetMin === 'number' ? structuredData.budgetMin : null,
      budget_max: typeof structuredData.budgetMax === 'number' ? structuredData.budgetMax : null,
      preferred_locations: Array.isArray(structuredData.location) ? structuredData.location as string[] : null,
      timeline: typeof structuredData.timeline === 'string' ? structuredData.timeline : null,
      notes: typeof structuredData.notes === 'string' ? structuredData.notes : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating lead:', error);
  } else {
    console.log('Lead created successfully for call:', call.id);
  }
}

// Store call transcript
async function storeTranscript(supabase: ReturnType<typeof createServiceRoleClient>, callId: string, transcript: string) {
  // Parse transcript and store as individual entries
  // For now, we'll store the entire transcript as one entry
  const { error } = await supabase
    .from('call_transcripts')
    .insert({
      call_id: callId,
      transcript_text: transcript,
      speakers: {},
      word_timestamps: {},
      language: 'en',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error storing transcript:', error);
  }
}

// GET method for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Vapi webhook endpoint is ready',
  });
}