import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, VapiError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { VapiClient } from '@/lib/vapi';
import {
  validateWebhookEvent,
  isCallStartEvent,
  isCallEndEvent,
  isFunctionCallEvent,
  isTranscriptEvent,
  WebhookProcessingError,
  type WebhookEvent,
  type WebhookProcessingResult
} from '@/types/vapi-webhooks';
import { WebhookProcessor } from '@/lib/webhook-processor';
import { CallAnalyzer } from '@/lib/call-analyzer';

// Vapi webhook event types
type VapiWebhookEvent = {
  type: string;
  call?: {
    id: string;
    assistantId: string;
    phoneNumberId?: string;
    customer?: {
      number: string;
      name?: string;
    };
    status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer';
    startedAt?: string;
    endedAt?: string;
    duration?: number;
    cost?: number;
    transcript?: string;
    recording?: string;
    summary?: string;
    analysis?: {
      leadQualified: boolean;
      leadScore: number;
      leadType?: 'buyer' | 'seller' | 'investor' | 'renter';
      extractedInfo?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        propertyType?: string[];
        budgetMin?: number;
        budgetMax?: number;
        timeline?: string;
        location?: string[];
        notes?: string;
      };
    };
  };
  timestamp: string;
};

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

    let event: VapiWebhookEvent;
    try {
      event = JSON.parse(body);
    } catch (error) {
      throw new VapiError('Invalid JSON payload', 400);
    }

    console.log('Received Vapi webhook event:', event.type, event.call?.id);

    const supabase = createServiceRoleClient();

    // Only handle call-end events for reports
    switch (event.type) {
      case 'call-end':
        await handleCallEnd(supabase, event);
        break;
        
      default:
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

// Handle call start event
async function handleCallStart(supabase: any, event: VapiWebhookEvent) {
  if (!event.call) return;

  const { call } = event;

  // Find the assistant in our database
  const { data: assistant } = await supabase
    .from('assistants')
    .select('id, user_id, team_id')
    .eq('vapi_assistant_id', call.assistantId)
    .single();

  if (!assistant) {
    console.error('Assistant not found for Vapi ID:', call.assistantId);
    return;
  }

  // Create call record
  const { error } = await supabase
    .from('calls')
    .insert({
      vapi_call_id: call.id,
      assistant_id: assistant.id,
      phone_number_id: call.phoneNumberId,
      user_id: assistant.user_id,
      team_id: assistant.team_id,
      caller_number: call.customer?.number || 'unknown',
      caller_name: call.customer?.name,
      status: call.status,
      direction: 'inbound', // Assuming inbound for webhooks
      started_at: call.startedAt ? new Date(call.startedAt).toISOString() : new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error creating call record:', error);
  }
}

// Handle call end event - Create complete call report
async function handleCallEnd(supabase: any, event: VapiWebhookEvent) {
  if (!event.call) return;

  const { call } = event;

  // Find the assistant in our database
  const { data: assistant } = await supabase
    .from('assistants')
    .select('id, user_id')
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
        duration: call.duration || 0,
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
        phone_number_id: call.phoneNumberId,
        user_id: assistant.user_id,
        caller_number: call.customer?.number || 'unknown',
        caller_name: call.customer?.name,
        status: call.status,
        direction: 'inbound',
        started_at: call.startedAt ? new Date(call.startedAt).toISOString() : new Date().toISOString(),
        ended_at: call.endedAt ? new Date(call.endedAt).toISOString() : new Date().toISOString(),
        duration: call.duration || 0,
        cost: call.cost || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
  if (call.analysis?.leadQualified && call.analysis.extractedInfo) {
    await createLeadFromCall(supabase, callRecord, call.analysis);
  }

  // Store transcript if available
  if (call.transcript) {
    await storeTranscript(supabase, callRecord.id, call.transcript);
  }

  console.log('Call end report processed successfully:', call.id);
}

// Handle transcript events (real-time transcription)
async function handleTranscript(supabase: any, event: VapiWebhookEvent) {
  if (!event.call) return;

  // Find the call record
  const { data: existingCall } = await supabase
    .from('calls')
    .select('id')
    .eq('vapi_call_id', event.call.id)
    .single();

  if (!existingCall) {
    console.error('Call not found for transcript event:', event.call.id);
    return;
  }

  // In a real-time transcript event, you would have speaker and text information
  // For now, we'll store it as a simple transcript entry
  if (event.call.transcript) {
    await storeTranscript(supabase, existingCall.id, event.call.transcript);
  }
}

// Handle function calls from the assistant
async function handleFunctionCall(supabase: any, event: VapiWebhookEvent) {
  // This would handle any custom functions your assistant might call
  // For example: scheduling appointments, sending emails, etc.
  console.log('Function call event received:', event);
}

// Create lead from call analysis
async function createLeadFromCall(
  supabase: any,
  call: any,
  analysis: NonNullable<VapiWebhookEvent['call']>['analysis']
) {
  if (!analysis?.extractedInfo) return;

  const extractedInfo = analysis.extractedInfo;

  // Create lead record (removed team_id for single-user architecture)
  const { error } = await supabase
    .from('leads')
    .insert({
      call_id: call.id,
      user_id: call.user_id,
      first_name: extractedInfo.firstName,
      last_name: extractedInfo.lastName,
      email: extractedInfo.email,
      phone: extractedInfo.phone || call.caller_number,
      lead_type: analysis.leadType,
      lead_source: 'voice_call',
      status: 'new',
      property_type: extractedInfo.propertyType,
      budget_min: extractedInfo.budgetMin,
      budget_max: extractedInfo.budgetMax,
      preferred_locations: extractedInfo.location,
      timeline: extractedInfo.timeline,
      notes: extractedInfo.notes,
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
async function storeTranscript(supabase: any, callId: string, transcript: string) {
  // Parse transcript and store as individual entries
  // For now, we'll store the entire transcript as one entry
  const { error } = await supabase
    .from('call_transcripts')
    .insert({
      call_id: callId,
      content: transcript,
      speaker: 'system', // Would need to parse actual speaker information
      timestamp_offset: 0,
      created_at: new Date().toISOString(),
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