# PayPal Integration Environment Variables

Add these environment variables to your `.env.local` file:

## PayPal Configuration

```bash
# PayPal API Credentials (get from https://developer.paypal.com)
PAYPAL_CLIENT_ID=your-client-id-here
PAYPAL_CLIENT_SECRET=your-client-secret-here

# PayPal Environment
PAYPAL_MODE=sandbox # Use 'sandbox' for testing, 'live' for production

# PayPal Webhook ID (create in PayPal dashboard)
PAYPAL_WEBHOOK_ID=your-webhook-id-here

# PayPal Product & Plan IDs (create via API or dashboard)
PAYPAL_PRO_PLAN_ID=P-XXXXXXXXXXXX # Monthly Pro plan ID
```

## Setting up PayPal

### 1. Create PayPal Developer Account
1. Go to https://developer.paypal.com
2. Sign up or log in
3. Navigate to "My Apps & Credentials"

### 2. Create App
1. Click "Create App"
2. Name: "Voice Matrix Subscriptions"
3. Select "Merchant" account type
4. Copy the Client ID and Secret

### 3. Create Subscription Products & Plans

Run this setup script after configuring credentials:
```bash
npm run setup:paypal
```

Or manually create via PayPal API:

**Product:**
```json
{
  "name": "Voice Matrix Pro",
  "description": "AI Voice Assistant Platform",
  "type": "SERVICE",
  "category": "SOFTWARE"
}
```

**Plan:**
```json
{
  "product_id": "PROD-XXXXXXXXXXXX",
  "name": "Pro Monthly",
  "billing_cycles": [{
    "frequency": {
      "interval_unit": "MONTH",
      "interval_count": 1
    },
    "pricing_scheme": {
      "fixed_price": {
        "value": "25",
        "currency_code": "USD"
      }
    }
  }],
  "payment_preferences": {
    "auto_bill_outstanding": true,
    "payment_failure_threshold": 3
  }
}
```

### 4. Configure Webhooks
1. Go to https://developer.paypal.com/dashboard/webhooks
2. Add webhook URL: `https://your-domain.com/api/subscription/paypal/webhook`
3. Select events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `PAYMENT.SALE.COMPLETED`
   - `PAYMENT.SALE.REFUNDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
4. Copy the Webhook ID

### 5. Testing in Sandbox

1. Create sandbox accounts:
   - Business account (merchant)
   - Personal account (buyer)
2. Use sandbox credentials for `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`
3. Test with sandbox buyer account

## Complete .env.local Example

```bash
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAPI_API_KEY=your-vapi-key

# PayPal Configuration
PAYPAL_CLIENT_ID=AWLdkjf83kfjSDKFJ83kfjdkfj_SANDBOX
PAYPAL_CLIENT_SECRET=EH3kfj83kKDJF83kfjdkfjKDJF83kfj
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=WH-83KFJ83KFJ-83KFJ83K
PAYPAL_PRO_PLAN_ID=P-83KFJ83KFJDKFJ83K

# Email & Jobs
RESEND_API_KEY=re_123abc...
INTERNAL_JOB_TOKEN=super-secret-job-token-123
NEXT_PUBLIC_BASE_URL=https://voicematrix.ai
```

## Important Notes

1. **Sandbox vs Live**: Always use sandbox for development/testing
2. **Webhook Security**: PayPal will send a verification token with webhooks
3. **Currency**: Ensure USD is used consistently
4. **Subscription States**: PayPal subscriptions can be ACTIVE, SUSPENDED, CANCELLED
5. **Grace Period**: Configure payment failure threshold (recommended: 3 attempts)