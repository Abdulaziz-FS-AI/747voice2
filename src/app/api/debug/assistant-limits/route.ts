import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { UsageService } from '@/lib/services/usage.service';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'No user found'
      });
    }

    // Get user profile with limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get current assistant count
    const { data: assistants, count: assistantCount, error: assistantError } = await supabase
      .from('user_assistants')
      .select('id, name, created_at', { count: 'exact' })
      .eq('user_id', user.id);

    // Test canCreateAssistant function
    const usageService = new UsageService();
    let canCreateTest = { success: false, error: null as string | null };
    try {
      await usageService.canCreateAssistant(user.id);
      canCreateTest.success = true;
    } catch (error) {
      canCreateTest.error = error instanceof Error ? error.message : String(error);
    }

    // Test debug_user_limits function
    let debugLimitsResult: any = null;
    try {
      const result = await supabase.rpc('debug_user_limits', { user_uuid: user.id });
      debugLimitsResult = result.data;
    } catch (error) {
      debugLimitsResult = { error: error instanceof Error ? error.message : String(error) };
    }

    // Test can_create_assistant_debug function  
    let canCreateDebugResult: any = null;
    try {
      const result = await supabase.rpc('can_create_assistant_debug', { user_uuid: user.id });
      canCreateDebugResult = result.data;
    } catch (error) {
      canCreateDebugResult = { error: error instanceof Error ? error.message : String(error) };
    }

    // Test can_user_make_call function for assistant limits
    let canMakeCallResult: any = null;
    try {
      const result = await supabase.rpc('can_user_make_call', { user_uuid: user.id });
      canMakeCallResult = result.data;
    } catch (error) {
      canMakeCallResult = { error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email
        },
        profile: {
          exists: !!profile,
          max_assistants: profile?.max_assistants,
          max_minutes_monthly: profile?.max_minutes_monthly,
          current_usage_minutes: profile?.current_usage_minutes,
          full_profile: profile,
          error: profileError?.message
        },
        assistants: {
          count: assistantCount,
          actual_assistants: assistants?.length || 0,
          list: assistants,
          error: assistantError?.message
        },
        canCreateAssistant: canCreateTest,
        debugLimitsFunction: debugLimitsResult,
        canCreateDebugFunction: canCreateDebugResult,
        canMakeCallFunction: canMakeCallResult,
        calculations: {
          can_create: assistantCount !== null && profile?.max_assistants ? 
            assistantCount < profile.max_assistants : false,
          remaining_slots: profile?.max_assistants && assistantCount !== null ? 
            profile.max_assistants - assistantCount : null
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      debug: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}