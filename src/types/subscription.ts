// Frontend subscription types matching backend
export type SubscriptionType = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'inactive';

export interface SubscriptionPlan {
  id: SubscriptionType;
  name: string;
  price: number;
  features: {
    maxAssistants: number;
    maxMinutesMonthly: number;
    supportLevel: 'community' | 'priority';
  };
}

export interface UserSubscription {
  userId: string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  currentUsageMinutes: number;
  maxMinutesMonthly: number;
  currentAssistantCount: number;
  maxAssistants: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UsageDetails {
  minutes: {
    used: number;
    limit: number;
    percentage: number;
    daysUntilReset: number;
  };
  assistants: {
    count: number;
    limit: number;
    percentage: number;
  };
  calls: {
    totalThisMonth: number;
    successRate: number;
    averageDuration: number;
  };
}

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  usage: UsageDetails | null;
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  upgradeToProPlan: () => Promise<void>;
  downgradeToFreePlan: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

export interface UsageWarning {
  type: 'minutes' | 'assistants';
  level: 'warning' | 'critical';
  percentage: number;
  message: string;
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: Record<SubscriptionType, SubscriptionPlan> = {
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
    price: 25,
    features: {
      maxAssistants: 10,
      maxMinutesMonthly: 100,
      supportLevel: 'priority'
    }
  }
};