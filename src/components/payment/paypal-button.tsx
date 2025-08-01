'use client'

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalButtonProps {
  planId: string;
  amount: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PayPalButton({
  planId,
  amount,
  onSuccess,
  onError,
  onCancel,
  className,
  disabled = false
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const currency = 'USD';

  useEffect(() => {
    if (!scriptLoaded || !window.paypal || disabled) return;

    // Clear previous buttons
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'subscribe'
        },
        createSubscription: async (data: any, actions: any) => {
          try {
            // Create subscription via our API
            const response = await fetch('/api/subscription/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId })
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error?.message || 'Failed to create subscription');
            }

            // Extract subscription ID from the approval URL
            const url = new URL(result.data.url);
            const subscriptionId = url.searchParams.get('subscription_id');

            if (!subscriptionId) {
              throw new Error('No subscription ID in response');
            }

            return subscriptionId;
          } catch (error) {
            console.error('Subscription creation error:', error);
            toast({
              title: 'Error',
              description: error instanceof Error ? error.message : 'Failed to create subscription',
              variant: 'destructive'
            });
            throw error;
          }
        },
        onApprove: async (data: any) => {
          try {
            setLoading(true);

            // Activate the subscription
            const response = await fetch('/api/subscription/paypal/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionId: data.subscriptionID })
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error?.message || 'Failed to activate subscription');
            }

            toast({
              title: 'Success!',
              description: 'Your subscription has been activated successfully.',
            });

            onSuccess?.(result.data);
          } catch (error) {
            console.error('Subscription activation error:', error);
            toast({
              title: 'Activation Error',
              description: error instanceof Error ? error.message : 'Failed to activate subscription',
              variant: 'destructive'
            });
            onError?.(error);
          } finally {
            setLoading(false);
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          toast({
            title: 'Payment Error',
            description: 'An error occurred during payment. Please try again.',
            variant: 'destructive'
          });
          onError?.(err);
        },
        onCancel: () => {
          toast({
            title: 'Payment Cancelled',
            description: 'You cancelled the payment process.',
          });
          onCancel?.();
        }
      }).render(paypalRef.current);

      setLoading(false);
    } catch (error) {
      console.error('PayPal button render error:', error);
      setLoading(false);
    }
  }, [scriptLoaded, planId, disabled, onSuccess, onError, onCancel]);

  if (!clientId) {
    return (
      <div className="text-center p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">PayPal is not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`}
        strategy="lazyOnload"
        onLoad={() => setScriptLoaded(true)}
      />
      
      <div className={cn("relative", className)}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        <div 
          ref={paypalRef} 
          className={cn(
            "paypal-button-container",
            disabled && "opacity-50 pointer-events-none"
          )}
        />
        
        {!scriptLoaded && (
          <div className="text-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading PayPal...</p>
          </div>
        )}
      </div>
    </>
  );
}

// Standalone subscription button with all options
export function PayPalSubscribeButton({
  onSuccess,
  className
}: {
  onSuccess?: () => void;
  className?: string;
}) {
  return (
    <PayPalButton
      planId="pro"
      amount="25.00"
      onSuccess={() => {
        onSuccess?.();
        // Refresh the page to update subscription status
        window.location.href = '/dashboard/settings/billing?success=true';
      }}
      onCancel={() => {
        window.location.href = '/dashboard/settings/billing?cancelled=true';
      }}
      className={className}
    />
  );
}