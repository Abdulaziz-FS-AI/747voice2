# Usage Limit Enforcement Test Plan

## Overview
This test plan verifies that the usage limit system works correctly for Voice Matrix users.

## System Behavior
- Each user can create up to 3 assistants
- Each user has 10 minutes of total usage per month
- When 10 minutes are exceeded, ALL user assistants are limited to 10-second calls
- Limits reset monthly on the user's signup anniversary

## Prerequisites
1. Deploy `ADD_LIMIT_COLUMNS.sql` to Supabase
2. Ensure webhook is configured in VAPI settings
3. Have test user accounts ready

## Test Cases

### 1. Assistant Creation Limit (3 max)
**Steps:**
1. Sign up as a new user
2. Create first assistant ✓
3. Create second assistant ✓
4. Create third assistant ✓
5. Try to create fourth assistant

**Expected Result:**
- First 3 assistants created successfully
- Fourth attempt returns friendly error: "You have reached the maximum of 3 assistants"
- No authentication error shown

### 2. Usage Calculation from Call Logs
**Steps:**
1. Make several calls with different assistants
2. Check call_logs table has entries with:
   - assistant_id
   - user_id (populated by trigger)
   - duration_seconds
   - created_at

**Expected Result:**
- All calls logged correctly
- user_id automatically populated
- Durations recorded accurately

### 3. 10-Minute Limit Enforcement
**Steps:**
1. Make calls totaling ~9 minutes
2. Make another call that pushes total over 10 minutes
3. After webhook processes, check VAPI assistant settings

**Expected Result:**
- When 10 minutes exceeded:
  - All user's VAPI assistants updated with:
    - maxDurationSeconds: 10
    - firstMessage: "You've reached your monthly limit..."
    - endCallAfterSpokenWords.enabled: true
    - endCallAfterSpokenWords.spokenWords: 30
  - limit_enforced_at timestamp set in profiles table

### 4. Progressive Warnings
**Steps:**
1. Monitor dashboard as usage approaches limits
2. Check at 8 minutes (80%)
3. Check at 9 minutes (90%)
4. Check at 10+ minutes

**Expected Result:**
- Warning component shows:
  - 8 min: Yellow warning "Approaching limit"
  - 9 min: Orange warning "Critical - 1 minute remaining"
  - 10+ min: Red warning "Limit exceeded"

### 5. Monthly Reset
**Steps:**
1. Note user's signup date (e.g., 15th)
2. Wait for next month's anniversary (15th)
3. Run reset cron job or wait for daily job

**Expected Result:**
- On monthly anniversary:
  - limit_enforced_at cleared
  - All VAPI assistants restored to original settings
  - User can make full-length calls again

### 6. Webhook Processing
**Steps:**
1. Complete a call
2. Monitor webhook logs
3. Check limit enforcement

**Expected Result:**
- Webhook receives call-ended event
- UsageLimitService.checkAndEnforceLimit called
- If over 10 min, limits enforced immediately

## Manual Testing Commands

### Check User Usage
```sql
-- Get user's total usage this cycle
SELECT 
  u.email,
  p.created_at as signup_date,
  COUNT(cl.id) as total_calls,
  SUM(cl.duration_seconds) / 60.0 as total_minutes,
  p.limit_enforced_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN call_logs cl ON cl.user_id = p.id
WHERE u.email = 'test@example.com'
GROUP BY u.email, p.created_at, p.limit_enforced_at;
```

### Force Limit Enforcement (Testing)
```sql
-- Add test call to push user over limit
INSERT INTO call_logs (assistant_id, duration_seconds, created_at)
SELECT 
  (SELECT id FROM user_assistants WHERE user_id = 'USER_ID' LIMIT 1),
  300, -- 5 minutes
  NOW();
```

### Check Assistant Limits
```sql
-- View assistant states
SELECT 
  name,
  vapi_assistant_id,
  config->>'limitEnforced' as limit_enforced,
  config->>'limitMessage' as limit_message
FROM user_assistants
WHERE user_id = 'USER_ID';
```

### Manual Reset (Testing)
```javascript
// In API route or server function
import { UsageLimitService } from '@/lib/services/usage-limit.service'
await UsageLimitService.resetUserLimits('USER_ID')
```

## Verification Checklist

- [ ] Database has limit_enforced_at column in profiles
- [ ] Call logs populate user_id via trigger
- [ ] Assistant creation respects 3-limit gracefully
- [ ] Usage calculation sums all calls correctly
- [ ] 10-minute limit triggers VAPI updates
- [ ] All assistants get 10-second limit when exceeded
- [ ] Progressive warnings show in dashboard
- [ ] Monthly reset restores original configs
- [ ] Webhook processes limits after each call

## Common Issues & Solutions

### Issue: Limits not enforcing
- Check VAPI_API_KEY is configured
- Verify webhook URL in VAPI settings
- Check call_logs has user_id populated

### Issue: Reset not working
- Verify cron job is running
- Check user's signup anniversary date
- Ensure original configs stored in assistant config

### Issue: Wrong usage calculation
- Verify billing cycle calculation
- Check timezone handling
- Ensure all calls included in sum

## Edge Cases to Test

1. User with exactly 10 minutes usage
2. Multiple calls ending simultaneously
3. User deleting assistant after limit enforced
4. Signup on 31st (month boundary)
5. Timezone differences in cycle calculation