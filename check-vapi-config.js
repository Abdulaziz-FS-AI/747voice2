// Script to check VAPI configuration
// Run this to verify your VAPI integration is properly set up

console.log('🔍 Checking VAPI Configuration...\n')

// Check environment variables
const vapiApiKey = process.env.VAPI_API_KEY
const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL  
const makeWebhookSecret = process.env.MAKE_WEBHOOK_SECRET

console.log('📋 Environment Variables:')
console.log(`   VAPI_API_KEY: ${vapiApiKey ? '✅ Present (' + vapiApiKey.length + ' chars)' : '❌ Missing'}`)
console.log(`   MAKE_WEBHOOK_URL: ${makeWebhookUrl ? '✅ Present' : '❌ Missing'}`)
console.log(`   MAKE_WEBHOOK_SECRET: ${makeWebhookSecret ? '✅ Present (' + makeWebhookSecret.length + ' chars)' : '❌ Missing'}`)

if (vapiApiKey) {
  console.log(`   VAPI Key preview: ${vapiApiKey.substring(0, 10)}...${vapiApiKey.substring(vapiApiKey.length - 4)}`)
}

console.log('\n🧪 Testing VAPI Connection...')

if (!vapiApiKey) {
  console.log('❌ Cannot test VAPI - API key missing')
  console.log('\n💡 To fix:')
  console.log('1. Get your VAPI API key from https://vapi.ai/')
  console.log('2. Add VAPI_API_KEY to your .env.local file')
  console.log('3. Restart your development server')
  process.exit(1)
}

// Test VAPI connection
async function testVapiConnection() {
  try {
    console.log('🚀 Testing VAPI API connection...')
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ VAPI connection successful!')
      console.log(`📊 You have ${data.length || 0} existing assistants in VAPI`)
    } else {
      const errorData = await response.text()
      console.log('❌ VAPI connection failed:')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${errorData}`)
      
      if (response.status === 401) {
        console.log('\n💡 This looks like an authentication error.')
        console.log('   Please check your VAPI_API_KEY is correct.')
      } else if (response.status === 429) {
        console.log('\n💡 Rate limit exceeded.')
        console.log('   Wait a moment and try again.')
      }
    }
  } catch (error) {
    console.log('❌ Network error testing VAPI:', error.message)
  }
}

if (vapiApiKey) {
  testVapiConnection()
} else {
  console.log('❌ Skipping connection test - no API key')
}