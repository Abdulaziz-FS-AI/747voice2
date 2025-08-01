'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PayPalSubscribeButton } from '@/components/payment/paypal-button';
import { useSubscription } from '@/contexts/subscription-context';
import { Zap, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function UpgradeButton({
  variant = 'default',
  size = 'default',
  className,
  showIcon = true,
  children
}: UpgradeButtonProps) {
  const [showPayPalDialog, setShowPayPalDialog] = useState(false);
  const { subscription, refreshSubscription } = useSubscription();

  // Don't show if already Pro
  if (subscription?.type === 'pro' && subscription?.status === 'active') {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowPayPalDialog(true)}
        className={cn("gap-2", className)}
      >
        {showIcon && <Zap className="h-4 w-4" />}
        {children || 'Upgrade to Pro'}
      </Button>

      <Dialog open={showPayPalDialog} onOpenChange={setShowPayPalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Upgrade to Voice Matrix Pro
            </DialogTitle>
            <DialogDescription>
              Get access to advanced features and higher limits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan Details */}
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-semibold">Pro Plan</h3>
                <div className="text-right">
                  <span className="text-2xl font-bold">$25</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>10 AI Assistants</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>100 minutes per month</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Custom AI prompts</span>
                </li>
              </ul>
            </div>

            {/* Payment Options */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Secure payment via PayPal
              </p>
              
              <PayPalSubscribeButton
                onSuccess={async () => {
                  setShowPayPalDialog(false);
                  await refreshSubscription();
                }}
                className="w-full"
              />

              <p className="text-xs text-muted-foreground text-center">
                By subscribing, you agree to our{' '}
                <a href="/terms" className="underline hover:text-primary">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Quick upgrade card for dashboards
export function UpgradeCard({ className }: { className?: string }) {
  const { subscription } = useSubscription();

  if (subscription?.type === 'pro') {
    return null;
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6",
      className
    )}>
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Upgrade to Pro</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock more assistants and minutes
            </p>
          </div>
          <Zap className="h-8 w-8 text-primary/20" />
        </div>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold">$25</span>
            <span className="text-muted-foreground">/month</span>
          </div>
          <UpgradeButton size="sm" />
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
    </div>
  );
}