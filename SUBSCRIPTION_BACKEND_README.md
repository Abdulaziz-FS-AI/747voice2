# Voice Matrix Subscription Backend

## Overview

The subscription backend implements a complete usage-based SaaS billing system with:

- **Free Plan**: 1 AI assistant, 10 minutes/month
- **Pro Plan**: 10 AI assistants, 100 minutes/month, $25/month

### Key Features

1. **Usage Enforcement**: Automatically disables assistants when limits are exceeded
2. **Real-time Tracking**: Database triggers track usage automatically
3. **Phone Disconnection**: VAPI assistants have phones disconnected when over limit
4. **Stripe Integration**: Complete payment processing and subscription management
5. **Email Notifications**: Usage warnings, subscription changes, limit exceeded alerts
6. **Background Processing**: Queue-based VAPI synchronization
7. **Analytics**: Detailed usage analytics and projections

## Architecture

### Services Layer (`/src/lib/services/`)

- **SubscriptionService**: Core subscription management
- **UsageService**: Usage tracking and enforcement
- **PaymentService**: Stripe payment processing
- **VapiSyncService**: VAPI API synchronization
- **EmailService**: Email notifications via Resend

### API Endpoints

#### Subscription Management
- `GET /api/subscription` - Get current subscription and usage
- `PUT /api/subscription` - Update subscription (upgrade/downgrade)
- `DELETE /api/subscription` - Cancel subscription
- `POST /api/subscription/checkout` - Create Stripe checkout session
- `POST /api/subscription/portal` - Create customer portal session
- `POST /api/subscription/webhook` - Handle Stripe webhooks

#### Analytics
- `GET /api/subscription/analytics` - Detailed usage analytics

#### Admin
- `GET /api/admin/usage-summary` - System-wide usage summary (admin only)

#### Background Jobs
- `POST /api/jobs/process-vapi-sync` - Process VAPI sync queue

### Database Schema

#### Subscription Fields (profiles table)
```sql
subscription_type: 'free' | 'pro'
subscription_status: 'active' | 'cancelled' | 'past_due' | 'inactive'
current_usage_minutes: Current month's usage
max_minutes_monthly: Plan limit
max_assistants: Plan limit
billing_cycle_start/end: Billing period
stripe_customer_id: Stripe customer reference
stripe_subscription_id: Active subscription
```

#### Usage Tracking
- **call_logs**: Tracks all calls and durations
- **vapi_sync_queue**: Queue for VAPI API updates
- **subscription_events**: Audit log of all subscription changes

## Usage Enforcement Flow

1. **Call Ends** → Database trigger fires
2. **Usage Updated** → Check if over limit
3. **If Over Limit**:
   - Queue VAPI sync jobs to disable assistants
   - Send limit exceeded email
   - Update assistant states
4. **Background Job** → Process queue, disconnect phones
5. **User Upgrades** → Re-enable assistants

## Integration Guide

### 1. Check Usage Before Actions

```typescript
// In your API routes
import { UsageService } from '@/lib/services/usage.service';

const usageService = new UsageService();

// Before creating assistant
try {
  await usageService.canCreateAssistant(userId);
} catch (error) {
  // Handle limit exceeded
}

// Check if can make calls
const canCall = await usageService.canMakeCalls(userId);
```

### 2. Get Subscription Details

```typescript
// In your frontend
const response = await fetch('/api/subscription');
const { subscription, usage } = await response.json();

// Display usage
console.log(`Used ${usage.minutes.used}/${usage.minutes.limit} minutes`);
console.log(`${usage.minutes.daysUntilReset} days until reset`);
```

### 3. Upgrade to Pro

```typescript
// Create checkout session
const response = await fetch('/api/subscription/checkout', {
  method: 'POST',
  body: JSON.stringify({ planId: 'pro' })
});

const { data } = await response.json();
window.location.href = data.url; // Redirect to Stripe
```

## Testing

### Test Usage Limits

1. Set low limits in database:
```sql
UPDATE profiles 
SET max_minutes_monthly = 1 
WHERE id = 'user-id';
```

2. Make a call that exceeds 1 minute
3. Verify assistants are disabled

### Test Subscription Flow

1. Use Stripe test cards: https://stripe.com/docs/testing
2. Test upgrade, downgrade, cancellation
3. Verify webhooks are received

## Monitoring

### Key Metrics to Track

1. **Usage Patterns**:
   - Users approaching limits
   - Average usage by plan
   - Peak usage hours

2. **Subscription Metrics**:
   - Conversion rate (free → pro)
   - Churn rate
   - Revenue per user

3. **System Health**:
   - VAPI sync queue size
   - Failed payment rate
   - Email delivery rate

### SQL Queries for Monitoring

```sql
-- Users over 80% usage
SELECT email, current_usage_minutes, max_minutes_monthly,
       (current_usage_minutes::float / max_minutes_monthly * 100) as usage_pct
FROM profiles
WHERE current_usage_minutes > max_minutes_monthly * 0.8
ORDER BY usage_pct DESC;

-- Daily revenue
SELECT DATE(created_at), COUNT(*), SUM((metadata->>'amount')::int) / 100 as revenue
FROM subscription_events
WHERE event_type = 'payment_succeeded'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
```

## Deployment Checklist

- [ ] Set all environment variables (see SUBSCRIPTION_ENV_VARS.md)
- [ ] Run SQL migrations in order
- [ ] Configure Stripe webhook endpoint
- [ ] Set up background job runner (cron/scheduled task)
- [ ] Test payment flow with Stripe test mode
- [ ] Configure email domain in Resend
- [ ] Set up monitoring/alerting
- [ ] Test usage enforcement
- [ ] Document support procedures

## Support Procedures

### User Over Limit
1. Check `profiles` table for current usage
2. Check `vapi_sync_queue` for pending jobs
3. Manually process queue if needed
4. Consider one-time limit increase

### Payment Issues
1. Check Stripe dashboard for customer
2. Review `subscription_events` table
3. Use Stripe portal for refunds/adjustments

### VAPI Sync Issues
1. Check `vapi_sync_queue` for failed jobs
2. Manually retry failed jobs
3. Check VAPI API status