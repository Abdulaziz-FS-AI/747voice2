import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { validatePinSession } from '@/lib/pin-auth';

// GET /api/assistants - Get assigned assistants for PIN-authenticated client
export async function GET(request: NextRequest) {
  try {
    // PIN-based authentication
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const search = searchParams.get('search');

    const supabase = createServiceRoleClient('get_client_assistants');

    // Use the database function to get client assistants
    const { data: assistants, error } = await supabase
      .rpc('get_client_assistants', { client_id_input: client_id });

    if (error) {
      console.error('[Client Assistants API] Database query error:', error);
      throw error;
    }

    // Ensure assistants is always an array
    let filteredAssistants = Array.isArray(assistants) ? assistants : [];

    // Apply search filter if provided
    if (search) {
      filteredAssistants = filteredAssistants.filter((assistant: any) =>
        assistant.display_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const total = filteredAssistants.length;
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedAssistants = filteredAssistants.slice(from, to);

    return NextResponse.json({
      success: true,
      data: Array.isArray(paginatedAssistants) ? paginatedAssistants : [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET assistants failed:', error);
    return handleAPIError(error);
  }
}

// POST /api/assistants - DISABLED: No creation allowed for clients
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: {
      code: 'OPERATION_NOT_ALLOWED',
      message: 'Assistant creation is disabled. Assistants are managed by administrators only.'
    }
  }, { status: 403 });
}

// PATCH /api/assistants?action=refresh - Refresh all assistants from VAPI
export async function PATCH(request: NextRequest) {
  try {
    // PIN-based authentication
    const sessionResult = await validatePinSession(request);
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 });
    }

    const { client_id } = sessionResult;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action !== 'refresh') {
      return NextResponse.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid action. Use ?action=refresh' }
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient('refresh_assistants_from_vapi');

    // Get all client assistants
    const { data: assistants, error: fetchError } = await supabase
      .from('client_assistants')
      .select('*')
      .eq('client_id', client_id)

    if (fetchError) {
      console.error('[Refresh] Failed to fetch assistants:', fetchError);
      return NextResponse.json({
        success: false,
        error: { code: 'DB_ERROR', message: 'Failed to fetch assistants' }
      }, { status: 500 });
    }

    if (!assistants || assistants.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No assistants to refresh'
      });
    }

    // Refresh from VAPI if API key is available
    const refreshedAssistants = [];
    for (const assistant of assistants) {
      try {
        if (process.env.VAPI_API_KEY) {
          // Fetch from VAPI
          const vapiResponse = await fetch(`https://api.vapi.ai/assistant/${assistant.vapi_assistant_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });

          if (vapiResponse.ok) {
            const vapiData = await vapiResponse.json();
            
            // Update local record with VAPI data
            const { data: updatedAssistant, error: updateError } = await supabase
              .from('client_assistants')
              .update({
                first_message: vapiData.firstMessage || assistant.first_message,
                voice: vapiData.voice?.voiceId || assistant.voice,
                model: vapiData.model?.model || assistant.model,
                max_call_duration: vapiData.endCallConfig?.endCallMaxDuration || assistant.max_call_duration,
                system_prompt: vapiData.model?.systemPrompt || assistant.system_prompt,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', assistant.id)
              .select('*')
              .single();

            if (!updateError) {
              refreshedAssistants.push(updatedAssistant);
            } else {
              console.error(`[Refresh] Failed to update assistant ${assistant.id}:`, updateError);
              refreshedAssistants.push(assistant);
            }
          } else {
            console.error(`[Refresh] VAPI fetch failed for assistant ${assistant.id}`);
            refreshedAssistants.push(assistant);
          }
        } else {
          // No VAPI key, just update sync timestamp
          const { data: updatedAssistant, error: updateError } = await supabase
            .from('client_assistants')
            .update({
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', assistant.id)
            .select('*')
            .single();

          refreshedAssistants.push(updatedAssistant || assistant);
        }
      } catch (error) {
        console.error(`[Refresh] Error refreshing assistant ${assistant.id}:`, error);
        refreshedAssistants.push(assistant);
      }
    }

    return NextResponse.json({
      success: true,
      data: refreshedAssistants,
      message: `Refreshed ${refreshedAssistants.length} assistants from VAPI`
    });

  } catch (error) {
    console.error('PATCH assistants failed:', error);
    return handleAPIError(error);
  }
}