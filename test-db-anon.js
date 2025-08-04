require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test with anon key first
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('Environment check:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('Anon key length:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
console.log('Service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

async function testWithAnonKey() {
  try {
    console.log('\n=== TESTING WITH ANON KEY ===');
    
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabaseAnon
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Anon key connection error:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      
      // Check if it's RLS blocking us
      if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        console.log('\n🔍 This appears to be an RLS (Row Level Security) issue');
        console.log('The anon key works but RLS policies are blocking access');
        
        // Let's try to test if we can access without RLS restrictions
        console.log('\n2. Testing if RLS is the issue...');
        
        // Try a different approach - see if we can at least connect
        const { data: connectionTest, error: connectionError } = await supabaseAnon.rpc('version');
        if (!connectionError) {
          console.log('✅ Supabase connection works - issue is RLS policies');
        }
      }
    } else {
      console.log('✅ Anon key connection successful');
    }

  } catch (err) {
    console.error('❌ Unexpected error with anon key:', err.message);
  }
}

async function testRLS() {
  console.log('\n=== TESTING RLS POLICIES ===');
  
  try {
    // Try to check what tables exist
    console.log('1. Testing table access without authentication...');
    
    // This should fail with RLS if policies are enforcing authentication
    const { data, error } = await supabaseAnon
      .from('profiles')
      .select('id')
      .limit(1);
      
    if (error) {
      if (error.message?.includes('permission denied') || error.code === 'PGRST301') {
        console.log('✅ RLS is working (blocking unauthenticated access)');
        console.log('Error:', error.message);
        
        console.log('\n2. The issue is that RLS requires authentication');
        console.log('Solutions:');
        console.log('- Fix the service role key');
        console.log('- Or temporarily disable RLS for testing');
        console.log('- Or authenticate properly');
        
      } else {
        console.log('❌ Different error:', error.message);
      }
    } else {
      console.log('⚠️  RLS might be disabled - got data without auth');
    }
    
  } catch (err) {
    console.error('❌ RLS test error:', err.message);
  }
}

// Run both tests
Promise.resolve()
  .then(() => testWithAnonKey())
  .then(() => testRLS())
  .catch(err => console.error('Test failed:', err));