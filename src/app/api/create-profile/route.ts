import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

// POST /api/create-profile - Manually create missing user profile
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest()
    const user = authResult.user

    console.log('🔧 Creating profile for user:', user.id, user.email)

    const supabase = createServiceRoleClient('profile_creation')
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      })
    }

    // Create new profile with default limits
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || 'unknown@example.com',
        full_name: user.user_metadata?.full_name || 'Unknown User',
        subscription_type: 'free',
        subscription_status: 'active',
        current_usage_minutes: 0,
        max_minutes_monthly: 10,  // Free tier: 10 minutes
        max_assistants: 3,        // Free tier: 3 assistants
        onboarding_completed: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Profile creation error:', insertError)
      throw insertError
    }

    console.log('✅ Profile created successfully:', newProfile.id)

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    })

  } catch (error) {
    console.error('Create profile failed:', error)
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create profile'
      }
    }, { status: 500 })
  }
}