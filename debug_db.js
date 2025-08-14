// Debug database connection and test data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Supabase URL:', supabaseUrl?.substring(0, 30) + '...');
console.log('🔑 Service Key:', supabaseKey ? 'Present (' + supabaseKey.length + ' chars)' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function debugDatabase() {
  console.log('\n🧪 Testing database connection...\n');

  try {
    // 1. Check if clients table exists and has data
    console.log('1️⃣ Checking clients table...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('pin, company_name, is_active')
      .eq('is_active', true);

    if (clientsError) {
      console.error('❌ Clients table error:', clientsError);
      return;
    }

    console.log('📊 Active clients found:', clients?.length || 0);
    if (clients && clients.length > 0) {
      clients.forEach(client => {
        console.log(`   - ${client.company_name}: PIN ${client.pin.substring(0,2)}****`);
      });
    }

    // 2. Test the authenticate_pin function directly
    console.log('\n2️⃣ Testing authenticate_pin function...');
    const testPin = '123456';
    
    const { data: authData, error: authError } = await supabase
      .rpc('authenticate_pin', {
        pin_input: testPin,
        client_ip: '127.0.0.1',
        client_user_agent: 'Debug-Script'
      });

    if (authError) {
      console.error('❌ authenticate_pin function error:', authError);
      return;
    }

    console.log('📄 Function result:', JSON.stringify(authData, null, 2));

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugDatabase();