// Quick test script to check PIN authentication
const testPin = async (pin) => {
  console.log(`\n🧪 Testing PIN: ${pin}`);
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/pin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log(`✅ SUCCESS: ${result.message}`);
      console.log(`🔑 Token: ${result.data?.session_token?.substring(0, 20)}...`);
    } else {
      console.log(`❌ FAILED: ${result.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
  }
};

// Test all three PINs
const testAllPins = async () => {
  console.log('🚀 Starting PIN authentication tests...\n');
  
  await testPin('123456');
  await testPin('789012'); 
  await testPin('456789');
  await testPin('999999'); // Should fail
  
  console.log('\n✅ Tests completed!');
};

testAllPins();