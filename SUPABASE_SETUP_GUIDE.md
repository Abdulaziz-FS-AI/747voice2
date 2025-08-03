# Voice Matrix - Supabase Setup Guide

This guide will help you set up Voice Matrix in a new Supabase project with the simplified usage-based system.

## 🚀 Quick Setup

### 1. Create a New Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Save your project URL and keys

### 2. Run the Database Migration
1. Go to your Supabase Dashboard > SQL Editor
2. Copy the entire contents of `supabase/migrations/000_complete_voice_matrix_setup.sql`
3. Paste and run it in the SQL Editor
4. You should see: "Voice Matrix database setup completed successfully!"

### 3. Enable Required Extensions
The migration automatically enables:
- `uuid-ossp` - For UUID generation
- `pg_cron` - For scheduled tasks (monthly usage reset)

If pg_cron is not available, the monthly reset won't work automatically, but you can run it manually.

### 4. Configure Environment Variables
Create a `.env.local` file with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# VAPI Configuration
VAPI_API_KEY=your-vapi-api-key
VAPI_WEBHOOK_SECRET=your-webhook-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📊 Database Schema Overview

### Usage Limits (Simplified System)
- **10 minutes** of calls per month per user
- **3 AI assistants** maximum per user
- Real-time usage tracking via database triggers
- Automatic monthly reset on the 1st of each month

### Core Tables

#### `profiles`
- Extends Supabase auth.users
- Tracks usage: `current_usage_minutes`, `max_minutes_monthly`
- Limits: `max_assistants` (default: 3)
- Auto-created when user signs up

#### `user_assistants`
- AI assistant configurations
- Links to VAPI via `vapi_assistant_id`
- Personality, voice, and behavior settings

#### `call_logs`
- Records all calls with duration in seconds
- Auto-updates user usage via triggers
- Links to assistant and user

#### `call_analytics`
- Daily aggregated statistics
- Performance metrics per assistant

## 🔧 Key Features

### Real-Time Usage Tracking
When a call completes:
1. Call log is inserted with `duration_seconds`
2. Database trigger fires automatically
3. User's `current_usage_minutes` is updated
4. Usage limits are enforced in real-time

### Pre-Call Validation
Use the `can_user_make_call()` function:
```sql
SELECT * FROM can_user_make_call('user-uuid-here');
```

Returns:
```json
{
  "can_make_call": true,
  "can_create_assistant": true,
  "usage": {
    "minutes_used": 3.5,
    "minutes_limit": 10,
    "minutes_remaining": 6.5,
    "assistants_count": 2,
    "assistants_limit": 3,
    "assistants_remaining": 1
  }
}
```

### Monthly Usage Reset
Automatic reset via pg_cron on the 1st of each month. Manual reset:
```sql
SELECT reset_monthly_usage();
```

## 🛡️ Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies enforce data isolation

### Audit Logging
- All usage updates are logged
- Track user actions for compliance

## 📈 Monitoring Usage

### View Current Usage
```sql
-- Get usage summary for all users
SELECT * FROM user_usage_summary;

-- Get specific user's usage
SELECT * FROM user_usage_summary WHERE user_id = 'user-uuid';
```

### Check Usage Warnings
```sql
-- Find users near their limits
SELECT * FROM user_usage_summary 
WHERE (current_usage_minutes / max_minutes_monthly) > 0.8
   OR assistant_count >= max_assistants;
```

## 🔄 API Integration

### Usage Check Endpoint
```typescript
// GET /api/usage
const response = await fetch('/api/usage');
const { profile, usage } = await response.json();

// Pre-call validation
const validation = await fetch('/api/usage/validate-call', {
  method: 'POST',
  body: JSON.stringify({ 
    assistantId: 'assistant-uuid',
    estimatedDurationMinutes: 5 
  })
});
```

## 🚨 Troubleshooting

### Issue: Usage not updating
1. Check if triggers are created:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'call_usage_update_trigger';
```

2. Manually recalculate usage:
```sql
UPDATE profiles 
SET current_usage_minutes = calculate_monthly_usage(id)
WHERE id = 'user-uuid';
```

### Issue: pg_cron not available
Some Supabase plans don't include pg_cron. Alternative:
1. Use Supabase Edge Functions with a cron trigger
2. Call `reset_monthly_usage()` from your application
3. Use an external cron service

## 📝 Testing the System

### 1. Create a Test User
Sign up through your application or create directly:
```sql
INSERT INTO auth.users (email) VALUES ('test@example.com');
```

### 2. Simulate Call Usage
```sql
-- Insert a test call
INSERT INTO call_logs (
  assistant_id, 
  duration_seconds, 
  status
) VALUES (
  (SELECT id FROM user_assistants WHERE user_id = 'user-uuid' LIMIT 1),
  300, -- 5 minutes
  'completed'
);

-- Check updated usage
SELECT * FROM profiles WHERE id = 'user-uuid';
```

### 3. Test Limit Enforcement
```sql
-- Check if user can make calls
SELECT * FROM can_user_make_call('user-uuid');
```

## 🎯 Best Practices

1. **Monitor Usage Regularly**
   - Set up alerts for users approaching limits
   - Review usage patterns weekly

2. **Handle Edge Cases**
   - Failed calls shouldn't count against usage
   - Partial calls should be pro-rated

3. **Provide User Feedback**
   - Show remaining minutes in UI
   - Warn before limits are reached
   - Clear error messages when limits exceeded

## 📊 Default Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Call Minutes | 10/month | Resets on 1st |
| AI Assistants | 3 total | Hard limit |
| Calls | Unlimited | Within minute limit |

## 🔗 Related Documentation

- [Voice Matrix README](README.md)
- [API Documentation](docs/API.md)
- [VAPI Integration Guide](VAPI_IMPLEMENTATION_EXAMPLE.md)

---

**Need Help?** Check the audit_logs table for debugging information or contact support.