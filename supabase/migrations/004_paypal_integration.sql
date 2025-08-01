-- Add PayPal fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paypal_customer_id text,
ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
ADD COLUMN IF NOT EXISTS paypal_payer_id text,
ADD COLUMN IF NOT EXISTS payment_method_type text DEFAULT 'none' CHECK (payment_method_type IN ('none', 'paypal', 'card'));

-- Create payment history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id text NOT NULL UNIQUE,
  payment_provider text NOT NULL CHECK (payment_provider IN ('paypal', 'stripe')),
  amount decimal(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_method text,
  description text,
  invoice_number text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  transaction_id text REFERENCES public.payment_history(transaction_id),
  amount decimal(10, 2) NOT NULL,
  tax decimal(10, 2) DEFAULT 0,
  total decimal(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('paid', 'pending', 'void')),
  due_date date,
  paid_date timestamptz,
  pdf_url text,
  line_items jsonb NOT NULL DEFAULT '[]',
  billing_details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create PayPal webhook events table for idempotency
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id text PRIMARY KEY, -- PayPal event ID
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  summary text,
  processed boolean DEFAULT false,
  raw_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_processed ON public.paypal_webhook_events(processed);

-- RLS Policies
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

-- Payment history policies
CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payment history" ON public.payment_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Invoice policies
CREATE POLICY "Users can view own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage invoices" ON public.invoices
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Webhook events policies (service role only)
CREATE POLICY "Service role can manage webhook events" ON public.paypal_webhook_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  current_year text;
  last_number int;
  new_number text;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Get the last invoice number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INT)), 0)
  INTO last_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';
  
  -- Generate new number with padding
  new_number := 'INV-' || current_year || '-' || LPAD((last_number + 1)::text, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Update the subscription event types to include PayPal events
ALTER TABLE public.subscription_events 
DROP CONSTRAINT IF EXISTS subscription_events_event_type_check;

ALTER TABLE public.subscription_events
ADD CONSTRAINT subscription_events_event_type_check 
CHECK (event_type IN (
  'upgraded', 'downgraded', 'cancelled', 'renewed', 
  'payment_failed', 'usage_limit_exceeded', 'monthly_reset',
  'usage_warning', 'payment_method_updated', 'subscription_paused',
  'subscription_resumed', 'refund_processed'
));