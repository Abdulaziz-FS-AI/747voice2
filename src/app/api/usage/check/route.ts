import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { handleAPIError } from '@/lib/errors';

// GET /api/usage/check - Check current usage for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 });
    }

    // Get user profile with usage data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'User profile not found'
        }
      }, { status: 404 });
    }

    // Get assistant count
    const { count: assistantCount } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Calculate usage data
    const usageData = {
      user_id: user.id,
      email: profile.email,
      subscription_type: profile.subscription_type,
      subscription_status: profile.subscription_status,
      
      // Minutes usage
      minutes: {
        used: profile.current_usage_minutes || 0,
        limit: profile.max_minutes_monthly,
        remaining: Math.max(0, profile.max_minutes_monthly - (profile.current_usage_minutes || 0)),
        percentage: profile.max_minutes_monthly > 0 
          ? Math.round(((profile.current_usage_minutes || 0) / profile.max_minutes_monthly) * 100)
          : 0,
        is_over_limit: (profile.current_usage_minutes || 0) >= profile.max_minutes_monthly
      },
      
      // Assistants usage
      assistants: {
        count: assistantCount || 0,
        limit: profile.max_assistants,
        remaining: Math.max(0, profile.max_assistants - (assistantCount || 0)),
        percentage: profile.max_assistants > 0
          ? Math.round(((assistantCount || 0) / profile.max_assistants) * 100)
          : 0,
        is_at_limit: (assistantCount || 0) >= profile.max_assistants
      },
      
      // Billing info
      billing: {
        cycle_start: profile.billing_cycle_start,
        cycle_end: profile.billing_cycle_end,
        days_remaining: Math.max(0, Math.ceil(
          (new Date(profile.billing_cycle_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ))
      }
    };

    return NextResponse.json({
      success: true,
      data: usageData
    });

  } catch (error) {
    console.error('Usage check error:', error);
    return handleAPIError(error);
  }
}