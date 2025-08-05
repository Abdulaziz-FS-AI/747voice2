require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔑 TESTING SERVICE ROLE KEY VALIDITY');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

// Test the service role key
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testServiceRole() {
  try {
    console.log('\n1. Testing service role key validity...');
    
    // Test a simple query that should work with service role
    const { data, error } = await supabaseService
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Service role key INVALID:', error.message);
      console.error('Error details:', error);
      
      if (error.message?.includes('Invalid API key')) {
        console.log('\n🔧 SOLUTION: Get the correct service role key from Supabase dashboard');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');  
        console.log('3. Go to Settings → API');
        console.log('4. Copy the service_role key (NOT the anon key)');
        console.log('5. Update your .env.local file');
      }
      return false;
    } else {
      console.log('✅ Service role key is VALID');
      console.log('✅ Can access profiles table');
      return true;
    }
    
  } catch (err) {
    console.error('❌ Service role test failed:', err.message);
    return false;
  }
}

async function testCreateTestUser() {
  console.log('\n2. Testing user creation with service role...');
  
  try {
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    // Try to create/update the test user
    const { data, error } = await supabaseService
      .from('profiles')
      .upsert({
        id: testUserId,
        email: 'test@voicematrix.ai',
        full_name: 'Test User',
        subscription_type: 'free',
        subscription_status: 'active',
        current_usage_minutes: 0,
        max_minutes_monthly: 10,
        max_assistants: 3,
        onboarding_completed: true
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Cannot create test user with service role:', error.message);
      console.error('This suggests RLS is still blocking service role access');
      return false;
    } else {
      console.log('✅ Successfully created/updated test user with service role');
      console.log('✅ Service role can bypass RLS');
      return true;
    }
    
  } catch (err) {
    console.error('❌ User creation test failed:', err.message);
    return false;
  }
}

// Run tests
async function runAllTests() {
  const serviceRoleValid = await testServiceRole();
  
  if (serviceRoleValid) {
    await testCreateTestUser();
  }
  
  console.log('\n' + '='.repeat(50));
  if (serviceRoleValid) {
    console.log('✅ SERVICE ROLE WORKING - Assistant creation should work now');
  } else {
    console.log('❌ SERVICE ROLE BROKEN - Need to fix the key');
  }
}

runAllTests();