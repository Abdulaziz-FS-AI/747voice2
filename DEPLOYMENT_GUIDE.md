# Voice Matrix Usage Limit System - Deployment Guide

## 🎯 System Overview

The usage limit system enforces:
- **3 assistants maximum** per user
- **10 minutes total usage** per month
- When limits are exceeded, all assistants are restricted to **10-second calls**
- Limits reset monthly on the user's signup anniversary

## 📋 Deployment Steps

### Step 1: Deploy Database Changes

1. Go to Supabase Dashboard → SQL Editor
2. Run the contents of `ADD_LIMIT_COLUMNS.sql`:

```sql
-- Add columns needed for usage limit enforcement
-- Run this in Supabase SQL Editor

-- Add limit enforcement tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS limit_enforced_at TIMESTAMP WITH TIME ZONE;

-- Create an index for efficient billing cycle queries
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_limit_enforced ON profiles(limit_enforced_at);

-- Ensure call_logs has user_id populated by trigger
CREATE OR REPLACE FUNCTION update_call_log_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user_id from assistant
  SELECT ua.user_id INTO NEW.user_id
  FROM user_assistants ua
  WHERE ua.id = NEW.assistant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS set_call_log_user_id ON call_logs;
CREATE TRIGGER set_call_log_user_id
  BEFORE INSERT ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_call_log_user_id();
```

3. Verify deployment by running:
```sql
SELECT 
  'LIMIT_COLUMNS_CHECK' as status,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'limit_enforced_at') as has_limit_enforced_at,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'call_logs' AND column_name = 'user_id') as has_call_logs_user_id;
```

### Step 2: Configure VAPI Webhook

1. Log into your VAPI dashboard
2. Navigate to Settings → Webhooks
3. Add/Update webhook URL:
   - **URL**: `https://your-domain.com/api/webhooks/vapi`
   - **Events**: Select "call-ended"
   - **Secret**: Copy the secret and add to your environment variables

### Step 3: Update Environment Variables

Add to your `.env.local` or production environment:

```bash
# VAPI Webhook Secret (from VAPI dashboard)
VAPI_WEBHOOK_SECRET=your-webhook-secret-here

# Cron job secret (generate a random string)
CRON_SECRET=your-random-cron-secret
```

### Step 4: Set Up Cron Job (Vercel)

1. Create `vercel.json` if it doesn't exist:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-limits",
      "schedule": "0 0 * * *"
    }
  ]
}
```

2. The cron job will run daily at midnight UTC and reset limits for users whose monthly anniversary is that day.

### Step 5: Deploy Application

```bash
# Deploy to production
vercel --prod

# Or if using other platforms
npm run build
npm start
```

## 🔍 Verification Steps

### 1. Test Database Setup
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('limit_enforced_at', 'created_at');

-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'set_call_log_user_id';
```

### 2. Test Assistant Creation Limit
- Create a test user
- Try creating 4 assistants
- 4th should fail gracefully with message

### 3. Test Usage Tracking
- Make a test call
- Check `call_logs` table has entry with user_id populated
- Verify duration is recorded correctly

### 4. Test Limit Enforcement
- Make calls totaling over 10 minutes
- Verify all assistants get updated in VAPI with 10-second limits
- Check `limit_enforced_at` is set in profiles

### 5. Test Monthly Reset
- Manually run reset for a test user:
```bash
curl -X POST https://your-domain.com/api/cron/reset-limits \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🚨 Monitoring

### Check System Health
```sql
-- Users approaching limits
SELECT 
  u.email,
  COUNT(ua.id) as assistant_count,
  SUM(cl.duration_seconds) / 60.0 as total_minutes,
  p.limit_enforced_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN user_assistants ua ON ua.user_id = p.id
LEFT JOIN call_logs cl ON cl.user_id = p.id 
  AND cl.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY u.email, p.limit_enforced_at
HAVING SUM(cl.duration_seconds) / 60.0 > 8;

-- Users with enforced limits
SELECT COUNT(*) as enforced_count
FROM profiles
WHERE limit_enforced_at IS NOT NULL
AND limit_enforced_at >= date_trunc('month', CURRENT_DATE);
```

### Common Issues

**Issue: Limits not enforcing**
- Check VAPI webhook is configured correctly
- Verify VAPI_API_KEY in environment
- Check webhook logs for errors

**Issue: User_id not populated in call_logs**
- Verify trigger exists and is active
- Check assistant_id is valid in call_logs

**Issue: Reset not working**
- Verify cron job is running (check Vercel logs)
- Check user's signup anniversary date
- Ensure CRON_SECRET matches

## 📊 Usage Dashboard

Users can see their usage at `/dashboard` with:
- Current assistant count (X/3)
- Minutes used this month (X/10)
- Progressive warnings at 80% and 90%
- Clear indication when limits are exceeded

## 🔐 Security Notes

1. Webhook endpoint validates signatures
2. Cron job requires secret authentication
3. All limit updates use service role (bypasses RLS)
4. Users cannot bypass limits through API

## 📈 Future Enhancements

1. **Email Notifications**: Send warnings when approaching limits
2. **Grace Period**: Allow one extra minute before hard enforcement
3. **Upgrade Prompts**: Show upgrade options when limits reached
4. **Usage Analytics**: Detailed usage breakdown by assistant
5. **Flexible Limits**: Different limits for different subscription tiers

## 🎉 Success Criteria

The system is working correctly when:
- ✅ Users cannot create more than 3 assistants
- ✅ Usage is accurately tracked from call logs
- ✅ VAPI assistants are limited to 10 seconds after 10 minutes usage
- ✅ Limits reset automatically on monthly anniversary
- ✅ Dashboard shows accurate usage information
- ✅ No authentication errors - only friendly limit messages

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review logs in Supabase Dashboard
3. Check Vercel function logs
4. Contact support with specific error messages