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
    const { data: functions, error: functionsError } = await supabase
      .rpc('calculate_monthly_usage', { user_uuid: user.id })
      .then(() => ({ exists: true, error: null }))
      .catch(error => ({ exists: false, error: error.message }));

    // Try to call can_user_make_call function
    const { data: canMakeCall, error: canMakeCallError } = await supabase
      .rpc('can_user_make_call', { user_uuid: user.id })
      .then(result => ({ data: result.data, error: null }))
      .catch(error => ({ data: null, error: error.message }));

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
            exists: !canMakeCallError,
            data: canMakeCall,
            error: canMakeCallError?.message
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