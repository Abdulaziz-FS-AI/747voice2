# Subscription System Environment Variables

Add these environment variables to your `.env.local` file:

## Stripe Configuration

```bash
# Stripe API Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret from Stripe Dashboard

# Stripe Product/Price IDs (create in Stripe Dashboard)
STRIPE_PRO_PRICE_ID=price_... # Monthly price ID for Pro plan ($25/month)
```

## Email Configuration (Resend)

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_... # Your Resend API key
```

## Internal Job Configuration

```bash
# Internal job token for processing background tasks
INTERNAL_JOB_TOKEN=your-secret-job-token-here # Generate a secure random string
```

## Public URLs

```bash
# Base URL for your application
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # Change to your production URL
```

## Setting up Stripe

1. **Create a Stripe account** at https://stripe.com
2. **Get your API keys** from https://dashboard.stripe.com/apikeys
3. **Create a product and price**:
   - Go to https://dashboard.stripe.com/products
   - Click "Add product"
   - Name: "Voice Matrix Pro"
   - Price: $25.00/month
   - Copy the price ID (starts with `price_`)
4. **Set up webhook endpoint**:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://your-domain.com/api/subscription/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
   - Copy the signing secret

## Setting up Resend

1. **Create a Resend account** at https://resend.com
2. **Verify your domain** in the Resend dashboard
3. **Get your API key** from https://resend.com/api-keys
4. **Update the "from" email** in `email.service.ts` to use your verified domain

## Setting up Background Jobs

For production, you'll need to set up a cron job or scheduled task to call:
```
POST /api/jobs/process-vapi-sync
Headers: 
  x-internal-job-token: YOUR_INTERNAL_JOB_TOKEN
```

Recommended: Run every 5 minutes

## Example Complete .env.local

```bash
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VAPI_API_KEY=your-vapi-key

# New subscription variables
STRIPE_SECRET_KEY=sk_test_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_abc123...
STRIPE_PRO_PRICE_ID=price_1ABC...
RESEND_API_KEY=re_123abc...
INTERNAL_JOB_TOKEN=super-secret-job-token-123
NEXT_PUBLIC_BASE_URL=https://voicematrix.ai
```