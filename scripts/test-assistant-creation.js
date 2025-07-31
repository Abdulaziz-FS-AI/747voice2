#!/usr/bin/env node

/**
 * Test script for assistant creation
 * Tests all edge cases and error scenarios
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // You'll need to set this

// Test cases
const testCases = [
  {
    name: 'Valid assistant with minimal data',
    data: {
      name: 'Test Assistant 1',
      first_message: 'Hello! How can I help you today?'
    },
    expectedStatus: 201
  },
  {
    name: 'Valid assistant with all fields',
    data: {
      name: 'Test Assistant 2',
      company_name: 'Test Company',
      personality: 'friendly',
      personality_traits: ['friendly', 'helpful', 'patient'],
      model_id: 'gpt-4.1-mini-2025-04-14',
      voice_id: 'Sarah',
      max_call_duration: 600,
      first_message: 'Hi there! Welcome to Test Company. How may I assist you?',
      first_message_mode: 'assistant-speaks-first',
      background_sound: 'office',
      structured_questions: [
        {
          id: '1',
          question: 'What is your name?',
          structuredName: 'customer_name',
          type: 'string',
          description: 'Customer full name',
          required: true
        }
      ],
      evaluation_rubric: 'NumericScale',
      client_messages: ['end-of-call-report']
    },
    expectedStatus: 201
  },
  {
    name: 'Missing required name field',
    data: {
      first_message: 'Hello!'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Empty name field',
    data: {
      name: '',
      first_message: 'Hello!'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Missing required first_message field',
    data: {
      name: 'Test Assistant'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid personality value',
    data: {
      name: 'Test Assistant',
      first_message: 'Hello!',
      personality: 'invalid_personality'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid max_call_duration (too low)',
    data: {
      name: 'Test Assistant',
      first_message: 'Hello!',
      max_call_duration: 10
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid max_call_duration (too high)',
    data: {
      name: 'Test Assistant',
      first_message: 'Hello!',
      max_call_duration: 1000
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid structured question type',
    data: {
      name: 'Test Assistant',
      first_message: 'Hello!',
      structured_questions: [
        {
          id: '1',
          question: 'Test question',
          structuredName: 'test',
          type: 'invalid_type',
          description: 'Test',
          required: false
        }
      ]
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Invalid evaluation rubric',
    data: {
      name: 'Test Assistant',
      first_message: 'Hello!',
      evaluation_rubric: 'InvalidRubric'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  },
  {
    name: 'Long assistant name (255 chars)',
    data: {
      name: 'A'.repeat(255),
      first_message: 'Hello!'
    },
    expectedStatus: 201
  },
  {
    name: 'Too long assistant name (256 chars)',
    data: {
      name: 'A'.repeat(256),
      first_message: 'Hello!'
    },
    expectedStatus: 400,
    expectedError: 'VALIDATION_ERROR'
  }
];

// Test runner
async function runTests() {
  console.log('🧪 Starting assistant creation tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`📋 Test: ${testCase.name}`);
      
      const response = await fetch(`${API_URL}/api/assistants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify(testCase.data)
      });
      
      const result = await response.json();
      
      // Check status code
      if (response.status !== testCase.expectedStatus) {
        throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.status}`);
      }
      
      // Check error code if expected
      if (testCase.expectedError && result.error?.code !== testCase.expectedError) {
        throw new Error(`Expected error code ${testCase.expectedError}, got ${result.error?.code}`);
      }
      
      // For successful cases, verify response structure
      if (response.status === 201) {
        if (!result.success || !result.data || !result.data.id) {
          throw new Error('Invalid success response structure');
        }
        console.log(`✅ Created assistant with ID: ${result.data.id}`);
      } else {
        console.log(`✅ Got expected error: ${result.error?.code || 'Unknown'}`);
      }
      
      passed++;
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📋 Total: ${testCases.length}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if auth token is provided
if (!AUTH_TOKEN) {
  console.error('❌ Error: AUTH_TOKEN environment variable is required');
  console.error('   Usage: AUTH_TOKEN=your_token npm run test:assistant-creation');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});