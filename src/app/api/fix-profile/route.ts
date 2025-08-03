import { createServiceRoleClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceRoleClient('emergency-profile-fix')
    
    // Get all users from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Failed to get users:', usersError)
      return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
    }

    let created = 0
    let existing = 0
    
    // Check each user and create profile if missing
    for (const user of users) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create profile for this user
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'User',
            subscription_type: 'free',
            subscription_status: 'active',
            billing_cycle_start: new Date().toISOString(),
            billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            payment_method_type: 'none',
            current_usage_minutes: 0,
            max_minutes_monthly: 10,
            max_assistants: 3,
            usage_reset_date: new Date().toISOString().split('T')[0],
            onboarding_completed: false,
            setup_completed: false
          })

        if (insertError) {
          console.error(`Failed to create profile for ${user.email}:`, insertError)
        } else {
          created++
          console.log(`✅ Created profile for ${user.email}`)
        }
      } else {
        existing++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Profiles fixed: ${created} created, ${existing} already existed`,
      created,
      existing,
      total: users.length
    })

  } catch (error) {
    console.error('Profile fix failed:', error)
    return NextResponse.json({ 
      error: 'Profile fix failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}