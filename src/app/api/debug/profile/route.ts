import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        details: authError
      }, { status: 401 })
    }
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Get all profiles (for debugging)
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, email, created_at, subscription_type')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Try to create profile if missing
    let creationResult = null
    if (!profile && profileError?.code === 'PGRST116') {
      const { data: created, error: createError } = await supabase
        .rpc('ensure_profile_exists', { user_id: user.id })
      
      creationResult = { created, createError }
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata,
        created_at: user.created_at
      },
      profile: profile || null,
      profileError: profileError || null,
      allProfiles: allProfiles || [],
      allProfilesError: allProfilesError || null,
      creationResult
    })
  } catch (error) {
    console.error('Debug profile error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}