import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface ValidateCallRequest {
  assistantId: string;
  estimatedDurationMinutes?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ValidateCallRequest = await request.json();
    const { assistantId, estimatedDurationMinutes = 1 } = body;

    if (!assistantId) {
      return NextResponse.json(
        { error: { message: 'Assistant ID is required' } },
        { status: 400 }
      );
    }

    // Verify assistant belongs to user
    const { data: assistant, error: assistantError } = await supabase
      .from('user_assistants')
      .select('id, user_id, name')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: { message: 'Assistant not found or access denied' } },
        { status: 404 }
      );
    }

    // Check user's current usage and limits
    const { data: usageCheck, error: usageError } = await supabase
      .rpc('can_user_make_call', { user_uuid: user.id });

    if (usageError) {
      console.error('Usage check error:', usageError);
      return NextResponse.json(
        { error: { message: 'Failed to validate usage limits' } },
        { status: 500 }
      );
    }

    const canMakeCall = usageCheck.can_make_call;
    const usage = usageCheck.usage;
    
    // Check if estimated call would exceed limits
    const estimatedNewUsage = usage.minutes_used + estimatedDurationMinutes;
    const wouldExceedWithEstimate = estimatedNewUsage > usage.minutes_limit;

    // Build validation result
    const validation = {
      canMakeCall,
      wouldExceedWithEstimate,
      assistant: {
        id: assistant.id,
        name: assistant.name
      },
      usage: {
        currentMinutes: usage.minutes_used,
        limitMinutes: usage.minutes_limit,
        remainingMinutes: Math.max(0, usage.minutes_limit - usage.minutes_used),
        estimatedUsageAfterCall: estimatedNewUsage,
        estimatedRemainingAfterCall: Math.max(0, usage.minutes_limit - estimatedNewUsage)
      },
      validation: {
        isValid: canMakeCall && !wouldExceedWithEstimate,
        reason: !canMakeCall 
          ? 'Monthly minute limit already exceeded'
          : wouldExceedWithEstimate 
          ? `Estimated call duration (${estimatedDurationMinutes} min) would exceed remaining limit (${Math.max(0, usage.minutes_limit - usage.minutes_used).toFixed(1)} min)`
          : 'Call can proceed'
      }
    };

    return NextResponse.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Call validation error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// GET endpoint to check general usage limits
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Check user's current usage and limits
    const { data: usageCheck, error: usageError } = await supabase
      .rpc('can_user_make_call', { user_uuid: user.id });

    if (usageError) {
      console.error('Usage check error:', usageError);
      return NextResponse.json(
        { error: { message: 'Failed to check usage limits' } },
        { status: 500 }
      );
    }

    const usage = usageCheck.usage;

    return NextResponse.json({
      success: true,
      data: {
        canMakeCall: usageCheck.can_make_call,
        canCreateAssistant: usageCheck.can_create_assistant,
        limits: {
          minutes: {
            used: usage.minutes_used,
            limit: usage.minutes_limit,
            remaining: usage.minutes_remaining,
            percentage: (usage.minutes_used / usage.minutes_limit) * 100
          },
          assistants: {
            count: usage.assistants_count,
            limit: usage.assistants_limit,
            remaining: usage.assistants_remaining,
            percentage: (usage.assistants_count / usage.assistants_limit) * 100
          }
        },
        warnings: {
          minutesWarning: usage.minutes_used / usage.minutes_limit >= 0.8,
          minutesCritical: usage.minutes_used / usage.minutes_limit >= 0.9,
          assistantsWarning: usage.assistants_count / usage.assistants_limit >= 0.8,
          assistantsCritical: usage.assistants_count >= usage.assistants_limit
        }
      }
    });

  } catch (error) {
    console.error('Usage limits check error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}