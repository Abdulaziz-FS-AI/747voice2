// Emergency profile fix - run this in browser console on your app
// This creates profiles for users who don't have them

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key needed

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function fixUserProfiles() {
  try {
    // Get all users from auth.users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }

    console.log(`Found ${users.users.length} users`)

    // Check which users don't have profiles
    for (const user of users.users) {
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
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
            current_usage_minutes: 0,
            max_minutes_monthly: 10,
            max_assistants: 3,
            subscription_type: 'free',
            subscription_status: 'active',
            onboarding_completed: false,
            setup_completed: false
          })

        if (insertError) {
          console.error(`Error creating profile for ${user.email}:`, insertError)
        } else {
          console.log(`✅ Created profile for ${user.email}`)
        }
      } else {
        console.log(`Profile already exists for ${user.email}`)
      }
    }

    console.log('Profile fix complete!')
  } catch (error) {
    console.error('Profile fix failed:', error)
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('Run: fixUserProfiles()')
}