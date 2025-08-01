import { SubscriptionPlan } from '@/lib/types/subscription.types';

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    features: {
      maxAssistants: 1,
      maxMinutesMonthly: 10,
      supportLevel: 'community'
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 2500, // $25.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID, // Set in env
    features: {
      maxAssistants: 10,
      maxMinutesMonthly: 100,
      supportLevel: 'priority'
    }
  }
} as const;

export const DEFAULT_PLAN = SUBSCRIPTION_PLANS.free;

// Helper functions
export function getPlanById(planId: string): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planId] || DEFAULT_PLAN;
}

export function getPlanLimits(planId: string) {
  const plan = getPlanById(planId);
  return {
    maxAssistants: plan.features.maxAssistants,
    maxMinutesMonthly: plan.features.maxMinutesMonthly
  };
}

// Usage warning thresholds
export const USAGE_WARNING_THRESHOLDS = {
  minutes: {
    warning: 0.8,  // 80%
    critical: 0.9  // 90%
  },
  assistants: {
    warning: 0.8,
    critical: 1.0
  }
} as const;