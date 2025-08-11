import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, VapiError } from '@/lib/errors';
import { createServerSupabaseClient } from '@/lib/supabase';
import { VapiClient } from '@/lib/vapi';
import type { Database } from '@/types/database';
import { 
  validateWebhookEvent, 
  isCallEndEvent, 
  type WebhookEvent,
  type CallEndEvent
} from '@/types/vapi-webhooks';
import { rateLimitWebhook } from '@/lib/middleware/rate-limiting';
import { 
  validateWebhookSecurity, 
  verifyWebhookSignature, 
  auditWebhookEvent,
  getVAPIAllowedIPs,
  getWebhookSecurityHeaders
} from '@/lib/security/webhook-security';
// import { ErrorTracker, BusinessMetrics } from '@/lib/monitoring/sentry';

// POST /api/webhooks/vapi - Handle Vapi webhook events
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventType = 'unknown';
  
  try {
    // 🔒 SECURITY: Comprehensive webhook security validation
    const securityResult = await validateWebhookSecurity(request, {
      maxBodySize: 512 * 1024, // 512KB for VAPI webhooks
      timestampTolerance: 300, // 5 minutes
      allowedIPs: getVAPIAllowedIPs(),
      requireHTTPS: process.env.NODE_ENV === 'production'
    });
    
    if (!securityResult.isValid) {
      auditWebhookEvent('security_failed', 'vapi', false, {
        reason: securityResult.reason,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for')
      });
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Webhook security validation failed',
        },
      }, { 
        status: 403,
        headers: getWebhookSecurityHeaders()
      });
    }
    
    const body = securityResult.body!;
    
    // Apply rate limiting for webhooks
    const rateLimitResponse = await rateLimitWebhook(request)
    if (rateLimitResponse) {
      console.log('🚫 [Webhook] Rate limit exceeded')
      return rateLimitResponse
    }
    
    const signature = request.headers.get('x-vapi-signature') || '';
    const webhookSecret = process.env.VAPI_WEBHOOK_SECRET;

    // 🔒 SECURITY: Enhanced signature verification
    if (webhookSecret && !verifyWebhookSignature(body, signature, webhookSecret)) {
      auditWebhookEvent('signature_failed', 'vapi', false, {
        hasSignature: !!signature,
        signatureLength: signature.length,
        userAgent: request.headers.get('user-agent')
      });
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      }, { 
        status: 401,
        headers: getWebhookSecurityHeaders()
      });
    }

    const parsedEvent = validateWebhookEvent(JSON.parse(body));
    if (!parsedEvent) {
      throw new VapiError('Invalid webhook event format', 400);
    }
    const event = parsedEvent;

    console.log('Received Vapi webhook event:', event.type, event.callId);

    const supabase = await createServerSupabaseClient();

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
    console.error('Webhook processing failed:', error)
    return handleAPIError(error);
  }
}


// Handle call end event - Create complete call report
async function handleCallEnd(supabase: Awaited<Awaited<ReturnType<typeof createServerSupabaseClient>>>, event: CallEndEvent) {
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
    .from('call_info_log')
    .select('*')
    .eq('vapi_call_id', call.id)
    .single();

  if (existingCall) {
    // Update existing call record
    const { data: updatedCall, error: updateError } = await supabase
      .from('call_info_log')
      .update({
        evaluation: call.status === 'completed' ? 'good' : 'failed', // Map old status to new evaluation
        ended_at: call.endedAt ? new Date(call.endedAt).toISOString() : new Date().toISOString(),
        duration_minutes: call.endedAt && call.startedAt ? 
          Math.ceil((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / (1000 * 60)) : 0,
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
      .from('call_info_log')
      .insert({
        assistant_id: assistant.id,
        duration_minutes: call.endedAt && call.startedAt ? 
          Math.ceil((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / (1000 * 60)) : 0,
        evaluation: call.status === 'completed' ? 'good' : 'failed', // Map old status to new evaluation
        caller_number: 'unknown',
        started_at: call.startedAt ? new Date(call.startedAt).toISOString() : new Date().toISOString(),
        ended_at: call.endedAt ? new Date(call.endedAt).toISOString() : null,
        transcript: null,
        structured_data: {},
        summary: null
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating call record:', insertError);
      return;
    }
    callRecord = newCall;
  }

  // Track business metrics for call completion
  const duration = (callRecord.duration_minutes || 0) * 60 // Convert minutes to seconds for metrics
  const cost = callRecord.cost || 0
  
  // Get user ID from assistant for metrics
  const { data: assistantData } = await supabase
    .from('user_assistants')
    .select('user_id')
    .eq('id', assistant.id)
    .single()
  
  if (assistantData?.user_id) {
    BusinessMetrics.trackCallCompleted(assistantData.user_id, assistant.id, duration, cost)
  }

  // Process lead information if available
  // TODO: Implement lead management when leads table is added
  // if (call.analysis?.structuredData) {
  //   await createLeadFromCall(supabase, callRecord, call.analysis.structuredData);
  // }

  // Store transcript if available
  // TODO: Implement transcript storage when call_transcripts table is added
  // if (call.transcript) {
  //   await storeTranscript(supabase, callRecord.id, call.transcript);
  // }

  console.log('Call end report processed successfully:', call.id);
  console.log(`Call duration: ${callRecord.duration_minutes}m - Usage tracking trigger should fire automatically`);
  
  // Check and enforce usage limits
  if (assistantData?.user_id) {
    const { UsageLimitService } = await import('@/lib/services/usage-limit.service')
    const limitEnforced = await UsageLimitService.checkAndEnforceLimit(assistantData.user_id)
    
    if (limitEnforced) {
      console.log(`🚨 Usage limit enforced for user ${assistantData.user_id}`)
    }
  }
}


// TODO: Implement lead management when leads table is added
// Create lead from call analysis
// async function createLeadFromCall(
//   supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
//   call: Database['public']['Tables']['call_logs']['Row'],
//   structuredData: Record<string, unknown>
// ) {
//   if (!structuredData) return;

//   // Get user_id from the assistant
//   const { data: assistant } = await supabase
//     .from('user_assistants')
//     .select('user_id')
//     .eq('id', call.assistant_id)
//     .single();

//   if (!assistant) {
//     console.error('Assistant not found for call:', call.id);
//     return;
//   }

//   // Create lead record (removed team_id for single-user architecture)
//   const { error } = await supabase
//     .from('leads')
//     .insert({
//       call_id: call.id,
//       user_id: assistant.user_id,
//       first_name: typeof structuredData.firstName === 'string' ? structuredData.firstName : null,
//       last_name: typeof structuredData.lastName === 'string' ? structuredData.lastName : null,
//       email: typeof structuredData.email === 'string' ? structuredData.email : null,
//       phone: typeof structuredData.phone === 'string' ? structuredData.phone : call.caller_number,
//       lead_type: typeof structuredData.leadType === 'string' && ['buyer', 'seller', 'investor', 'renter'].includes(structuredData.leadType) ? structuredData.leadType as 'buyer' | 'seller' | 'investor' | 'renter' : null,
//       lead_source: 'voice_call',
//       status: 'new',
//       property_type: Array.isArray(structuredData.propertyType) ? structuredData.propertyType as string[] : null,
//       budget_min: typeof structuredData.budgetMin === 'number' ? structuredData.budgetMin : null,
//       budget_max: typeof structuredData.budgetMax === 'number' ? structuredData.budgetMax : null,
//       preferred_locations: Array.isArray(structuredData.location) ? structuredData.location as string[] : null,
//       timeline: typeof structuredData.timeline === 'string' ? structuredData.timeline : null,
//       notes: typeof structuredData.notes === 'string' ? structuredData.notes : null,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     });

//   if (error) {
//     console.error('Error creating lead:', error);
//   } else {
//     console.log('Lead created successfully for call:', call.id);
//   }
// }

// TODO: Implement transcript storage when call_transcripts table is added
// Store call transcript
// async function storeTranscript(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, callId: string, transcript: string) {
//   // Parse transcript and store as individual entries
//   // For now, we'll store the entire transcript as one entry
//   const { error } = await supabase
//     .from('call_transcripts')
//     .insert({
//       call_id: callId,
//       transcript_text: transcript,
//       speakers: {},
//       word_timestamps: {},
//       language: 'en',
//       processing_status: 'completed',
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString(),
//     });

//   if (error) {
//     console.error('Error storing transcript:', error);
//   }
// }

// GET method for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Vapi webhook endpoint is ready',
  });
}