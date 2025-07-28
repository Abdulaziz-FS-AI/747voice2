#!/usr/bin/env node

/**
 * Update specific assistant via API
 * Assistant ID: 32fb55e6-9d53-4def-8ce2-88620de813c2
 */

const assistantId = '32fb55e6-9d53-4def-8ce2-88620de813c2';
const baseUrl = 'http://localhost:3001'; // Your dev server
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Random update payload
const updatePayload = {
  name: 'Emma - Premium Real Estate Expert',
  personality: 'friendly',
  company_name: 'Elite Property Solutions',
  max_call_duration: 1200, // 20 minutes
  background_ambiance: 'professional',
  voice_id: 'voice_friendly_female_en',
  agent_name: 'Emma Rodriguez',
  tone: 'professional',
  custom_instructions: 'Specialize in luxury properties over $500K. Always ask about budget, timeline, and preferred neighborhoods. Mention our exclusive listings.',
  first_message: 'Hello! This is Emma from Elite Property Solutions. I\'m here to help you find the perfect luxury property. What brings you to the market today?'
};

console.log('🎯 ASSISTANT UPDATE TEST');
console.log('='.repeat(50));
console.log('Assistant ID:', assistantId);
console.log('Server URL:', baseUrl);
console.log('\n📝 UPDATE PAYLOAD:');
console.log(JSON.stringify(updatePayload, null, 2));

// Method 1: Direct Database Update (bypassing auth for testing)
async function updateViaDatabase() {
  console.log('\n🔧 METHOD 1: Direct Database Update');
  console.log('-'.repeat(30));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // Get current assistant first
    const { data: current, error: fetchError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();
      
    if (fetchError) {
      console.log('❌ Failed to fetch assistant:', fetchError.message);
      return;
    }
    
    console.log('📋 Current assistant:', current.name);
    console.log('📋 Current company:', current.company_name);
    console.log('📋 Vapi ID:', current.vapi_assistant_id || 'None');
    
    // Update the assistant
    const { data: updated, error: updateError } = await supabase
      .from('assistants')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString()
      })
      .eq('id', assistantId)
      .select()
      .single();
      
    if (updateError) {
      console.log('❌ Update failed:', updateError.message);
      return;
    }
    
    console.log('✅ DATABASE UPDATE SUCCESSFUL!');
    console.log('📋 New name:', updated.name);
    console.log('📋 New company:', updated.company_name);
    console.log('📋 New duration:', updated.max_call_duration + 's');
    console.log('📋 Updated at:', updated.updated_at);
    
    if (updated.vapi_assistant_id) {
      console.log('\n🎯 CHECK YOUR VAPI DASHBOARD:');
      console.log(`   Assistant should now be named: "${updated.name}"`);
      console.log(`   Company should show: "${updated.company_name}"`);
      console.log(`   Vapi Assistant ID: ${updated.vapi_assistant_id}`);
    }
    
  } catch (error) {
    console.log('❌ Database update failed:', error.message);
  }
}

// Method 2: API Call (shows the exact API structure)
async function showAPICall() {
  console.log('\n🌐 METHOD 2: API Call Structure');
  console.log('-'.repeat(30));
  
  console.log('📡 Endpoint:');
  console.log(`   PATCH ${baseUrl}/api/assistants/${assistantId}`);
  
  console.log('\n📋 Headers:');
  console.log('   Content-Type: application/json');
  console.log('   Authorization: Bearer <your-auth-token>');
  
  console.log('\n📦 Body:');
  console.log(JSON.stringify(updatePayload, null, 2));
  
  console.log('\n💻 cURL Command:');
  console.log(`curl -X PATCH "${baseUrl}/api/assistants/${assistantId}" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer <your-token>" \\');
  console.log(`  -d '${JSON.stringify(updatePayload)}'`);
  
  console.log('\n🔧 JavaScript Fetch:');
  console.log(`
const response = await fetch('${baseUrl}/api/assistants/${assistantId}', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <your-token>'
  },
  body: JSON.stringify(${JSON.stringify(updatePayload, null, 2)})
});

const result = await response.json();
console.log('Update result:', result);
  `);
}

// Run both methods
async function runTest() {
  await showAPICall();
  await updateViaDatabase();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Check your Vapi dashboard');
  console.log('2. Look for the updated assistant name and settings');
  console.log('3. Test calling the assistant to verify changes');
}

runTest();