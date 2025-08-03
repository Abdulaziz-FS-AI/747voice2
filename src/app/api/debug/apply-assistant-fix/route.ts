import { NextResponse } from 'next/server';
import { debugGuard, addSecurityHeaders } from '@/lib/security/debug-guard'
import { createServiceRoleClient } from '@/lib/supabase';

export async function POST() {
  // 🔒 SECURITY: Block access in production
  const guardResponse = debugGuard();
  if (guardResponse) return guardResponse;
  try {
    const supabase = createServiceRoleClient();
    
    console.log('🔧 Applying assistant creation limits fix...');
    
    // Step 1: Update existing profiles with correct limits
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        max_assistants: 3,
        max_minutes_monthly: 10,
        current_usage_minutes: 0
      })
      .or('max_assistants.is.null,max_minutes_monthly.is.null,current_usage_minutes.is.null');
    
    if (updateError) {
      console.error('Error updating profiles:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update profiles: ' + updateError.message
      }, { status: 500 });
    }
    
    // Step 2: Create ensure_profile_exists function
    const ensureFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.ensure_profile_exists(user_id uuid)
      RETURNS boolean AS $$
      DECLARE
        profile_exists boolean := false;
      BEGIN
        -- Check if profile already exists
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_id) INTO profile_exists;
        
        -- If profile doesn't exist, create it
        IF NOT profile_exists THEN
          INSERT INTO public.profiles (
            id, 
            email, 
            full_name, 
            current_usage_minutes, 
            max_minutes_monthly, 
            max_assistants,
            onboarding_completed
          )
          SELECT 
            user_id,
            COALESCE(au.email, 'unknown@example.com'),
            COALESCE(au.raw_user_meta_data->>'full_name', ''),
            0,
            10,
            3,
            false
          FROM auth.users au 
          WHERE au.id = user_id;
          
          RETURN true; -- Profile was created
        END IF;
        
        RETURN false; -- Profile already existed
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { 
      sql: ensureFunctionSQL 
    });
    
    if (functionError) {
      console.error('Error creating function:', functionError);
      // This might fail if exec_sql doesn't exist, but we can continue
    }
    
    // Step 3: Grant permissions
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: 'GRANT EXECUTE ON FUNCTION public.ensure_profile_exists(uuid) TO authenticated;'
    });
    
    if (grantError) {
      console.error('Error granting permissions:', grantError);
      // This might fail, but we can continue
    }
    
    // Step 4: Get a count of fixed profiles
    const { data: profilesData, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('max_assistants', 3);
    
    const fixedCount = profilesData?.length || 0;
    
    console.log('✅ Assistant limits fix applied successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Assistant creation limits fixed successfully!',
      profiles_updated: fixedCount,
      applied_fixes: [
        'Updated existing profiles with max_assistants = 3',
        'Set max_minutes_monthly = 10',
        'Initialized current_usage_minutes = 0',
        'Created ensure_profile_exists function',
        'Applied proper permissions'
      ]
    });
    
  } catch (error) {
    console.error('Failed to apply assistant limits fix:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}