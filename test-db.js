require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('Environment check:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

async function testConnection() {
  try {
    // Test 1: Basic connection - Check if profiles table exists
    console.log('\n1. Testing profiles table access...');
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Profiles table error:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Error message:', error.message);
      return;
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Test 2: Check user_assistants table
    console.log('\n2. Testing user_assistants table access...');
    const { data: assistantsData, error: assistantsError } = await supabase
      .from('user_assistants')
      .select('count')
      .limit(1);
      
    if (assistantsError) {
      console.error('❌ user_assistants table error:', assistantsError);
      console.error('Error code:', assistantsError.code);
      console.error('Error details:', assistantsError.details);
      return;
    } else {
      console.log('✅ user_assistants table accessible');
    }

    // Test 3: Try to create/check test user
    console.log('\n3. Checking/creating test user...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking test user:', checkError);
      return;
    } 
    
    if (!existingUser) {
      console.log('Test user not found, creating...');
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
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
        
      if (createError) {
        console.error('❌ Failed to create test user:', createError);
        console.error('Create error code:', createError.code);
        console.error('Create error details:', createError.details);
        return;
      } else {
        console.log('✅ Test user created successfully');
      }
    } else {
      console.log('✅ Test user already exists:', existingUser.email);
    }

    console.log('\n4. Testing assistant count query...');
    const { count: assistantCount, error: countError } = await supabase
      .from('user_assistants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testUserId)
      .neq('assistant_state', 'deleted');
      
    if (countError) {
      console.error('❌ Assistant count error:', countError);
    } else {
      console.log('✅ Assistant count query successful:', assistantCount);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testConnection();