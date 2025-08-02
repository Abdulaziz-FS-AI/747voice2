'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserSubscription, UsageDetails, SubscriptionContextType } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/subscription');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch subscription');
      }

      setSubscription(data.data.subscription);
      setUsage(data.data.usage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Subscription fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only - NO AUTO REFRESH for performance
  useEffect(() => {
    fetchSubscription();

    // Listen for subscription updates from other tabs only
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'subscription-updated') {
        fetchSubscription();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchSubscription]);

  // Upgrade to Pro plan
  const upgradeToProPlan = async () => {
    try {
      setLoading(true);
      
      // Create checkout session
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'pro' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create checkout session');
      }

      // For PayPal, we'll handle the redirect in the PayPal button component
      // This returns the approval URL that the PayPal button will use
      return data.data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upgrade failed';
      toast({
        title: 'Upgrade Error',
        description: message,
        variant: 'destructive'
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Downgrade to Free plan
  const downgradeToFreePlan = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to downgrade');
      }

      toast({
        title: 'Downgraded to Free Plan',
        description: 'Your subscription has been updated. Excess assistants will be removed.',
      });

      // Notify other tabs
      localStorage.setItem('subscription-updated', Date.now().toString());
      
      // Refresh subscription data
      await fetchSubscription();
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Downgrade failed';
      toast({
        title: 'Downgrade Error',
        description: message,
        variant: 'destructive'
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/subscription', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }

      toast({
        title: 'Subscription Cancelled',
        description: 'You will retain Pro features until the end of your billing period.',
      });

      // Notify other tabs
      localStorage.setItem('subscription-updated', Date.now().toString());
      
      // Refresh subscription data
      await fetchSubscription();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cancellation failed';
      toast({
        title: 'Cancellation Error',
        description: message,
        variant: 'destructive'
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const value: SubscriptionContextType = {
    subscription,
    usage,
    loading,
    error,
    refreshSubscription: fetchSubscription,
    upgradeToProPlan,
    downgradeToFreePlan,
    cancelSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// Hook to use subscription context
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Utility hook for checking limits
export function useCanPerformAction(actionType: 'assistants' | 'minutes') {
  const { subscription, usage } = useSubscription();

  if (!subscription || !usage) {
    return { canPerform: false, reason: 'Loading subscription data...' };
  }

  if (actionType === 'assistants') {
    const canPerform = usage.assistants.count < usage.assistants.limit;
    const reason = !canPerform 
      ? `You've reached your limit of ${usage.assistants.limit} assistant${usage.assistants.limit > 1 ? 's' : ''}. Upgrade to Pro for more.`
      : null;
    return { canPerform, reason };
  }

  if (actionType === 'minutes') {
    const canPerform = usage.minutes.used < usage.minutes.limit;
    const reason = !canPerform
      ? `You've used all ${usage.minutes.limit} minutes this month. Upgrade to Pro for more.`
      : null;
    return { canPerform, reason };
  }

  return { canPerform: true, reason: null };
}

// Hook for usage warnings
export function useUsageWarnings() {
  const { usage } = useSubscription();
  const warnings: Array<{
    type: 'minutes' | 'assistants';
    level: 'warning' | 'critical';
    percentage: number;
    message: string;
  }> = [];

  if (!usage) return warnings;

  // Check minutes usage
  if (usage.minutes.percentage >= 90) {
    warnings.push({
      type: 'minutes' as const,
      level: 'critical' as const,
      percentage: usage.minutes.percentage,
      message: `Critical: You've used ${usage.minutes.percentage}% of your monthly minutes`
    });
  } else if (usage.minutes.percentage >= 80) {
    warnings.push({
      type: 'minutes' as const,
      level: 'warning' as const,
      percentage: usage.minutes.percentage,
      message: `Warning: You've used ${usage.minutes.percentage}% of your monthly minutes`
    });
  }

  // Check assistants usage
  if (usage.assistants.percentage >= 100) {
    warnings.push({
      type: 'assistants' as const,
      level: 'critical' as const,
      percentage: usage.assistants.percentage,
      message: `You've reached your assistant limit`
    });
  } else if (usage.assistants.percentage >= 80) {
    warnings.push({
      type: 'assistants' as const,
      level: 'warning' as const,
      percentage: usage.assistants.percentage,
      message: `You're using ${usage.assistants.count} of ${usage.assistants.limit} assistants`
    });
  }

  return warnings;
}