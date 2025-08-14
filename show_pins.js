// Show actual PINs in database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false }}
);

async function showPins() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('pin, company_name, is_active')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('🔍 ACTUAL PINS IN DATABASE:');
  clients.forEach(client => {
    console.log(`   - ${client.company_name}: PIN = ${client.pin}`);
  });
}

showPins();