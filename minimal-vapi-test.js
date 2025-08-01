// Minimal VAPI test - tests the exact same assistant structure as our working assistants
require('dotenv').config({ path: '.env.local' })

const VAPI_API_KEY = process.env.VAPI_API_KEY

if (!VAPI_API_KEY) {
  console.log('❌ No VAPI API key found!')
  process.exit(1)
}

async function testMinimalAssistant() {
  try {
    console.log('🚀 Testing minimal VAPI assistant creation...')
    
    // Use the exact same structure as your existing working assistants
    const minimalAssistant = {
      name: `Test Assistant ${Date.now()}`,
      voice: {
        voiceId: "Hana",
        provider: "vapi"
      },
      model: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant. Be professional and assist users with their needs."
          }
        ],
        provider: "openai",
        maxTokens: 500,
        temperature: 0.7
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-3-general",
        language: "en"
      },
      firstMessage: "Hello! How can I help you today?",
      firstMessageMode: "assistant-speaks-first",
      maxDurationSeconds: 300,
      backgroundSound: "office",
      recordingEnabled: true,
      fillersEnabled: true,
      endCallFunctionEnabled: false,
      dialKeypadFunctionEnabled: false,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4
    }
    
    console.log('📤 Sending request to VAPI...')
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalAssistant)
    })
    
    console.log(`📥 Response: ${response.status} ${response.statusText}`)
    
    const responseText = await response.text()
    console.log(`📄 Response body: ${responseText}`)
    
    if (response.ok) {
      const assistant = JSON.parse(responseText)
      console.log('✅ SUCCESS! Assistant created with ID:', assistant.id)
      
      // Clean up - delete the test assistant
      try {
        await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${VAPI_API_KEY}`
          }
        })
        console.log('🗑️ Test assistant deleted')
      } catch (e) {
        console.log('⚠️ Could not delete test assistant:', e.message)
      }
      
    } else {
      console.log('❌ VAPI Error:', responseText)
    }
    
  } catch (error) {
    console.log('❌ Network Error:', error.message)
  }
}

testMinimalAssistant()