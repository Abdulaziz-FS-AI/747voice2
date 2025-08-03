// Run this in browser console to fix profiles immediately
// Go to http://localhost:3002 and open console, then paste this:

console.log('🔧 Running emergency profile fix...');

fetch('/api/fix-profile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ Profile fix result:', data);
  if (data.success) {
    console.log(`🎉 Success! Created ${data.created} profiles, ${data.existing} already existed`);
    console.log('🔄 Now refreshing page...');
    setTimeout(() => location.reload(), 2000);
  } else {
    console.error('❌ Profile fix failed:', data);
  }
})
.catch(error => {
  console.error('❌ Error running profile fix:', error);
});