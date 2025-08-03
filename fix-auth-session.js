// Run this in browser console to fix authentication session
// Go to your Voice Matrix app and open Developer Tools > Console, then paste this:

console.log('🔧 Fixing authentication session...');

// Clear all Supabase cookies
document.cookie.split(";").forEach(function(c) { 
  const cookieName = c.split("=")[0].trim();
  if (cookieName.includes('supabase') || cookieName.includes('sb-')) {
    document.cookie = cookieName + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;"; 
    console.log('🗑️ Cleared cookie:', cookieName);
  }
});

// Clear localStorage
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
    console.log('🗑️ Cleared localStorage:', key);
  }
});

// Clear sessionStorage
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    sessionStorage.removeItem(key);
    console.log('🗑️ Cleared sessionStorage:', key);
  }
});

console.log('✅ Session cleared! Please refresh the page and sign in again.');
console.log('🔄 Run: location.reload() to refresh');

// Auto refresh after 2 seconds
setTimeout(() => {
  location.reload();
}, 2000);