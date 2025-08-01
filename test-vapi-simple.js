// Simple VAPI test script
require('dotenv').config({ path: '.env.local' })

const VAPI_API_KEY = process.env.VAPI_API_KEY

console.log('🧪 Simple VAPI Test')
console.log('==================')
console.log('VAPI_API_KEY:', VAPI_API_KEY ? `Present (${VAPI_API_KEY.length} chars)` : 'Missing')

if (!VAPI_API_KEY) {
  console.log('❌ No VAPI API key found!')
  console.log('💡 Add VAPI_API_KEY to your .env.local file')
  process.exit(1)
}

async function testVAPI() {
  try {
    console.log('\n🚀 Testing simple GET to VAPI...')
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📥 Response: ${response.status} ${response.statusText}`)
    
    const data = await response.text()
    console.log(`📄 Response body: ${data.substring(0, 500)}`)
    
    if (response.ok) {
      console.log('✅ VAPI connection working!')
      const assistants = JSON.parse(data)
      console.log(`📊 Found ${assistants.length} existing assistants`)
    } else {
      console.log('❌ VAPI error detected')
      console.log('This is likely why assistant creation is failing')
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message)
  }
}

testVAPI()