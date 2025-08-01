#!/usr/bin/env node

// Script to show the exact curl command that gets sent to VAPI
require('dotenv').config({ path: '.env.local' })

const VAPI_API_KEY = process.env.VAPI_API_KEY

if (!VAPI_API_KEY) {
  console.log('❌ No VAPI API key found!')
  process.exit(1)
}

// Sample assistant data (matches what the form sends)
const assistantPayload = {
  name: "Test Assistant",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an AI assistant working for Test Company. Your personality should be professional. Always maintain a professional tone throughout the conversation."
      }
    ],
    maxTokens: 500,
    temperature: 0.7
  },
  voice: {
    provider: "vapi",
    voiceId: "Elliot"
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
  analysisPlan: {
    minMessagesThreshold: 2,
    summaryPlan: {
      enabled: true,
      timeoutSeconds: 30
    }
  },
  clientMessages: ["transcript"], // Fixed backend value
  endCallMessage: "Thank you for calling! Have a great day!",
  recordingEnabled: true,
  fillersEnabled: true,
  endCallFunctionEnabled: false,
  dialKeypadFunctionEnabled: false,
  silenceTimeoutSeconds: 30,
  responseDelaySeconds: 0.4,
  server: {
    url: process.env.MAKE_WEBHOOK_URL || "https://hook.eu2.make.com/example",
    secret: process.env.MAKE_WEBHOOK_SECRET || "webhook-secret",
    headers: {
      "Content-Type": "application/json",
      "x-make-apikey": process.env.MAKE_WEBHOOK_SECRET || "webhook-secret"
    }
  },
  serverMessages: ["end-of-call-report"] // Fixed backend value
}

console.log('🚀 EXACT CURL COMMAND THAT GETS SENT TO VAPI:')
console.log('=' .repeat(80))
console.log()

const curlCommand = `curl -X POST https://api.vapi.ai/assistant \\
  -H "Authorization: Bearer ${VAPI_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(assistantPayload, null, 2)}'`

console.log(curlCommand)
console.log()
console.log('=' .repeat(80))
console.log()

// Also show it in a format that's easier to copy-paste
console.log('🔧 FORMATTED FOR EASY COPY-PASTE:')
console.log()

// Escape the JSON properly for shell
const escapedJson = JSON.stringify(assistantPayload).replace(/'/g, "\\'").replace(/"/g, '\\"')

console.log(`curl -X POST "https://api.vapi.ai/assistant" \\`)
console.log(`  -H "Authorization: Bearer ${VAPI_API_KEY}" \\`)
console.log(`  -H "Content-Type: application/json" \\`)
console.log(`  -d "${escapedJson}"`)

console.log()
console.log('=' .repeat(80))
console.log('💡 You can copy this curl command and run it directly in terminal to test VAPI!')