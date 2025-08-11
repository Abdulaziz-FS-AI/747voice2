# Analytics Fixes Test Plan

## ✅ FIXES IMPLEMENTED

### 1. Success Detection Fixed
- **OLD PROBLEM:** Would mark "unsuccessful" as successful because it contains "success"
- **FIX APPLIED:** Now uses exact matching and explicit failure detection
- **TEST:** Try evaluation values: "unsuccessful", "not successful", "failure"
- **EXPECTED:** All should be marked as failed

### 2. Cost Calculation Now Configurable
- **OLD PROBLEM:** Hardcoded $0.10/minute
- **FIX APPLIED:** Uses `VAPI_COST_PER_MINUTE` environment variable
- **CONFIGURED:** Set to 0.10 in `.env.local` (can be changed anytime)
- **TEST:** Change the value and restart to see updated costs

### 3. Data Validation Added
- **OLD PROBLEM:** Would crash with negative/invalid durations
- **FIX APPLIED:** Validates all numeric inputs, caps at 24 hours max
- **TEST:** Try inserting call with negative duration_minutes
- **EXPECTED:** Treated as 0, no crash

### 4. Timezone Issues Fixed
- **OLD PROBLEM:** Calls appeared on wrong days due to timezone mishandling
- **FIX APPLIED:** Uses UTC dates consistently
- **TEST:** Insert calls at different times, check daily stats
- **EXPECTED:** Consistent day grouping regardless of local timezone

### 5. Foreign Key Flexibility
- **OLD PROBLEM:** Would show no data if FK pointed to wrong field
- **FIX APPLIED:** Tries both internal ID and VAPI ID
- **TEST:** Analytics should work regardless of FK configuration
- **EXPECTED:** Data loads either way

## 🧪 TEST QUERIES

### Test 1: Verify Foreign Key Configuration
```sql
-- Check what the foreign key actually references
SELECT 
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%assistant_id%fkey%'
AND conrelid = 'public.call_info_log'::regclass;
```

### Test 2: Test Success Detection
```sql
-- Insert test data with various evaluation values
INSERT INTO call_info_log (assistant_id, duration_minutes, evaluation, started_at)
VALUES 
  ('YOUR_ASSISTANT_ID', 5, 'unsuccessful', NOW()),
  ('YOUR_ASSISTANT_ID', 5, 'not successful', NOW()),
  ('YOUR_ASSISTANT_ID', 5, 'success', NOW()),
  ('YOUR_ASSISTANT_ID', 5, 'successful', NOW()),
  ('YOUR_ASSISTANT_ID', 5, 'failed', NOW()),
  ('YOUR_ASSISTANT_ID', 5, true, NOW()),
  ('YOUR_ASSISTANT_ID', 5, false, NOW()),
  ('YOUR_ASSISTANT_ID', 5, 1, NOW()),
  ('YOUR_ASSISTANT_ID', 5, 0, NOW());

-- Check analytics API
-- Should show: 4 successful (success, successful, true, 1)
-- Should show: 5 failed (unsuccessful, not successful, failed, false, 0)
```

### Test 3: Test Invalid Data Handling
```sql
-- Insert invalid duration
INSERT INTO call_info_log (assistant_id, duration_minutes, evaluation, started_at)
VALUES 
  ('YOUR_ASSISTANT_ID', -10, 'test', NOW()),
  ('YOUR_ASSISTANT_ID', 9999, 'test', NOW()),
  ('YOUR_ASSISTANT_ID', NULL, 'test', NOW());

-- Check analytics API
-- Should not crash, negative treated as 0, large value capped at 1440
```

### Test 4: Test Cost Calculation
```sql
-- Insert calls with known durations
INSERT INTO call_info_log (assistant_id, duration_minutes, evaluation, started_at)
VALUES 
  ('YOUR_ASSISTANT_ID', 10, 'test', NOW()),
  ('YOUR_ASSISTANT_ID', 20, 'test', NOW()),
  ('YOUR_ASSISTANT_ID', 30, 'test', NOW());

-- Total: 60 minutes
-- At $0.10/min = $6.00 total cost
-- Check analytics shows $6.00
```

## 📊 EXPECTED ANALYTICS BEHAVIOR

### Main Analytics Page (`/dashboard/analytics`)
1. **Total Calls:** Count of all records
2. **Total Cost:** Sum of (duration_minutes * VAPI_COST_PER_MINUTE)
3. **Success Rate:** Only counts exact success matches, not substrings
4. **Daily Stats:** Groups by UTC date, not local time

### Assistant Analytics Page (`/dashboard/analytics/assistant`)
1. **Success Evaluation:** Uses same fixed logic
2. **Structured Questions:** Properly analyzes completion rates
3. **Recent Calls:** Shows evaluation field from call_info_log

## 🔍 HOW TO VERIFY FIXES

1. **Check Console Logs**
   - Look for: "Found calls using internal assistant IDs" or "Found calls using VAPI assistant IDs"
   - Look for: "Analytics summary:" with correct counts

2. **Check Network Tab**
   - GET `/api/analytics/overview` should return data
   - Check response for correct calculations

3. **Database Verification**
   ```sql
   -- Count what should appear
   SELECT 
     COUNT(*) as total_calls,
     COUNT(CASE WHEN evaluation IN ('successful', 'success', 'true', '1') THEN 1 END) as successful,
     SUM(duration_minutes) * 0.10 as total_cost
   FROM call_info_log
   WHERE assistant_id IN (
     SELECT id FROM user_assistants WHERE user_id = 'YOUR_USER_ID'
   );
   ```

## ✅ SUMMARY

All critical issues have been fixed:
- ✅ Success detection no longer has false positives
- ✅ Costs are configurable via environment variable
- ✅ Data validation prevents crashes
- ✅ Timezone handling is consistent (UTC)
- ✅ Works with both internal ID and VAPI ID foreign keys

The analytics page should now show accurate data!