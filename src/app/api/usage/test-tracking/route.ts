import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { handleAPIError } from '@/lib/errors';

// POST /api/usage/test-tracking - Test usage tracking (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assistant_id, duration_seconds = 120 } = body; // Default 2 minutes

    if (!assistant_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_ASSISTANT_ID',
          message: 'assistant_id is required'
        }
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Insert a test call log - the trigger should automatically update usage
    const { data: callLog, error: insertError } = await supabase
      .from('call_logs')
      .insert({
        assistant_id,
        duration_seconds,
        cost: duration_seconds * 0.001, // $0.001 per second for testing
        caller_number: 'test-tracking',
        started_at: new Date(Date.now() - duration_seconds * 1000).toISOString(),
        transcript: 'Test call for usage tracking',
        structured_data: { test: true },
        success_evaluation: 'test',
        summary: 'Test call to verify usage tracking'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Get the assistant's user to check updated usage
    const { data: assistant } = await supabase
      .from('user_assistants')
      .select('user_id')
      .eq('id', assistant_id)
      .single();

    if (!assistant) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ASSISTANT_NOT_FOUND',
          message: 'Assistant not found'
        }
      }, { status: 404 });
    }

    // Get updated user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_usage_minutes, max_minutes_monthly')
      .eq('id', assistant.user_id)
      .single();

    const minutes_used = Math.ceil(duration_seconds / 60);

    return NextResponse.json({
      success: true,
      data: {
        call_log_id: callLog.id,
        duration_seconds,
        minutes_charged: minutes_used,
        user_usage: {
          current: profile?.current_usage_minutes || 0,
          limit: profile?.max_minutes_monthly || 0,
          remaining: Math.max(0, (profile?.max_minutes_monthly || 0) - (profile?.current_usage_minutes || 0))
        },
        message: `Test call logged. Usage should have increased by ${minutes_used} minutes.`
      }
    });

  } catch (error) {
    console.error('Test tracking error:', error);
    return handleAPIError(error);
  }
}