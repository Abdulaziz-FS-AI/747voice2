// Debug script to check assistants in database
// Run this with: node debug-assistants.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAssistants() {
  try {
    console.log('🔍 Checking assistants in database...')
    
    // Get all assistants
    const { data: allAssistants, error: allError } = await supabase
      .from('user_assistants')
      .select('id, user_id, name, vapi_assistant_id')
      .limit(10)
    
    if (allError) {
      console.error('❌ Error fetching assistants:', allError)
      return
    }
    
    console.log('✅ Total assistants found:', allAssistants?.length || 0)
    
    if (allAssistants && allAssistants.length > 0) {
      console.log('📋 Sample assistants:')
      allAssistants.forEach((assistant, index) => {
        console.log(`  ${index + 1}. ID: ${assistant.id}`)
        console.log(`     Name: ${assistant.name}`)
        console.log(`     User ID: ${assistant.user_id}`)
        console.log(`     VAPI ID: ${assistant.vapi_assistant_id}`)
        console.log('')
      })
    } else {
      console.log('⚠️  No assistants found in database!')
    }
    
    // Check profiles table too
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .limit(5)
    
    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError)
    } else {
      console.log('👥 User profiles found:', profiles?.length || 0)
      if (profiles && profiles.length > 0) {
        profiles.forEach((profile, index) => {
          console.log(`  ${index + 1}. ${profile.email} (${profile.id})`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error)
  }
}

debugAssistants()