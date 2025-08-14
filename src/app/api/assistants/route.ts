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

    let filteredAssistants = assistants || [];

    // Apply search filter if provided
    if (search) {
      filteredAssistants = filteredAssistants.filter((assistant: any) =>
        assistant.display_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const total = filteredAssistants.length;
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedAssistants = filteredAssistants.slice(from, to);

    return NextResponse.json({
      success: true,
      data: paginatedAssistants,
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