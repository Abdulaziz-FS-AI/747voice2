import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        debug: {
          step: 'auth',
          error: authError?.message || 'No user found',
          hasUser: false
        }
      });
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check if functions exist
    let functions: { exists: boolean; error: string | null };
    try {
      await supabase.rpc('calculate_monthly_usage', { user_uuid: user.id });
      functions = { exists: true, error: null };
    } catch (error) {
      functions = { exists: false, error: error instanceof Error ? error.message : String(error) };
    }

    // Try to call can_user_make_call function
    let canMakeCall: { data: any; error: string | null };
    try {
      const result = await supabase.rpc('can_user_make_call', { user_uuid: user.id });
      canMakeCall = { data: result.data, error: null };
    } catch (error) {
      canMakeCall = { data: null, error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile: {
          exists: !!profile,
          data: profile,
          error: profileError?.message
        },
        functions: {
          calculate_monthly_usage: functions,
          can_user_make_call: {
            exists: !canMakeCall.error,
            data: canMakeCall.data,
            error: canMakeCall.error
          }
        },
        databaseStatus: {
          profileTableAccessible: !profileError || profileError.code !== 'PGRST301',
          functionsAccessible: functions.exists
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      debug: {
        step: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}