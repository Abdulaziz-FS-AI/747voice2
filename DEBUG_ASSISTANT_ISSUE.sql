-- DEBUG: Why is the assistant_id not found?
-- Let's investigate the data mismatch

-- 1. Check if this specific assistant exists anywhere
SELECT 'Looking for assistant 49f85a9a-dc4f-4b0a-98db-4068f09c9efc:' as search;

-- Check in user_assistants.id (internal UUID)
SELECT 
    'user_assistants.id search:' as location,
    id,
    vapi_assistant_id,
    name,
    user_id,
    created_at
FROM public.user_assistants 
WHERE id = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc'::uuid;

-- Check in user_assistants.vapi_assistant_id (VAPI UUID) 
SELECT 
    'user_assistants.vapi_assistant_id search:' as location,
    id,
    vapi_assistant_id,
    name,
    user_id,
    created_at
FROM public.user_assistants 
WHERE vapi_assistant_id = '49f85a9a-dc4f-4b0a-98db-4068f09c9efc';

-- 2. Show all assistants to see what we actually have
SELECT 'All assistants in database:' as info;
SELECT 
    id as internal_id,
    vapi_assistant_id,
    name,
    user_id,
    created_at
FROM public.user_assistants 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check what your webhook is trying to store
SELECT 'Recent call_info_log entries:' as info;
SELECT 
    assistant_id,
    vapi_call_id,
    duration_minutes,
    created_at
FROM public.call_info_log 
ORDER BY created_at DESC
LIMIT 5;

-- 4. The core issue: Your webhook logic
SELECT 'WEBHOOK LOGIC ANALYSIS:' as analysis;
SELECT '
Your webhook does this:
1. Make.com sends: payload.assistant_id = "49f85a9a-dc4f-4b0a-98db-4068f09c9efc"
2. Your code looks up: SELECT * FROM user_assistants WHERE vapi_assistant_id = "49f85a9a..."  
3. Your code stores: assistant.id (internal UUID)
4. But the lookup is failing!

The assistant either:
A) Does not exist in user_assistants table
B) Has a different vapi_assistant_id value
C) Was deleted/soft-deleted
' as explanation;