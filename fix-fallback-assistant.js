// Script to fix the fallback assistant in database
// This will either delete it or try to create a proper VAPI assistant for it

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixFallbackAssistant() {
  try {
    console.log('🔍 Looking for fallback assistants...')
    
    // Find all assistants with fallback VAPI IDs
    const { data: fallbackAssistants, error } = await supabase
      .from('user_assistants')
      .select('*')
      .like('vapi_assistant_id', 'fallback_%')
    
    if (error) {
      console.error('❌ Error fetching assistants:', error)
      return
    }
    
    console.log(`📋 Found ${fallbackAssistants?.length || 0} fallback assistants`)
    
    if (!fallbackAssistants || fallbackAssistants.length === 0) {
      console.log('✅ No fallback assistants found!')
      return
    }
    
    // Show details of fallback assistants
    fallbackAssistants.forEach((assistant, index) => {
      console.log(`\n📄 Fallback Assistant ${index + 1}:`)
      console.log(`   ID: ${assistant.id}`)
      console.log(`   Name: ${assistant.name}`)
      console.log(`   User ID: ${assistant.user_id}`)
      console.log(`   VAPI ID: ${assistant.vapi_assistant_id}`)
      console.log(`   Created: ${assistant.created_at}`)
    })
    
    console.log('\n🗑️  Options:')
    console.log('1. Delete these fallback assistants (recommended)')
    console.log('2. Keep them but they won\'t work for phone numbers')
    console.log('\nTo delete, run: DELETE FROM user_assistants WHERE vapi_assistant_id LIKE \'fallback_%\'')
    
    // Check if any phone numbers are assigned to these fallback assistants
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('user_phone_numbers')
      .select('id, friendly_name, assigned_assistant_id')
      .in('assigned_assistant_id', fallbackAssistants.map(a => a.id))
    
    if (phoneError) {
      console.error('❌ Error checking phone numbers:', phoneError)
    } else if (phoneNumbers && phoneNumbers.length > 0) {
      console.log('\n⚠️  WARNING: These phone numbers are assigned to fallback assistants:')
      phoneNumbers.forEach(phone => {
        console.log(`   - ${phone.friendly_name} (${phone.id})`)
      })
      console.log('   You need to reassign them to valid assistants before deleting!')
    }
    
  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

fixFallbackAssistant()