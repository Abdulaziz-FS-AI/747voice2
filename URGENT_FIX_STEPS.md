# URGENT FIX STEPS - Do these in exact order

## 1. FIRST - Install the database trigger in Supabase
1. Go to **supabase.com** 
2. Open your Voice Matrix project
3. Click **SQL Editor** in left sidebar
4. Create a new query
5. Copy and paste the contents of `FINAL_PROFILE_TRIGGER.sql`
6. Click **Run** button

## 2. SECOND - Clear your browser session completely
Open your browser console (F12) and run this:
```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear all cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

// Force reload
location.reload();
```

## 3. THIRD - Try signing up/logging in again
After the page reloads, the profile should be created automatically.

## Why this is happening:
- The browser session is corrupted with old authentication data
- The database doesn't have the profile creation trigger
- New users can't get profiles created, causing auth failures

## This will fix it permanently:
- The trigger creates profiles automatically for all new users
- Clearing browser data removes corrupted session
- Fresh login will work properly with the new trigger