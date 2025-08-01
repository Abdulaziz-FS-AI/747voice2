// Subscription System Types
export type SubscriptionType = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'inactive';

export interface SubscriptionPlan {
  id: SubscriptionType;
  name: string;
  price: number;
  priceId?: string; // Stripe price ID
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

export interface SubscriptionEvent {
  type: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'usage_limit_exceeded' | 'monthly_reset';
  userId: string;
  fromPlan?: SubscriptionType;
  toPlan?: SubscriptionType;
  metadata: Record<string, any>;
}

export interface VapiSyncJob {
  id: string;
  assistantId: string;
  vapiAssistantId: string;
  action: 'disable' | 'enable' | 'delete' | 'update';
  reason: string;
  priority: number;
  retryCount: number;
  error?: string;
}

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class UsageLimitError extends SubscriptionError {
  constructor(
    public limitType: 'minutes' | 'assistants',
    public current: number,
    public limit: number
  ) {
    super(
      `${limitType} limit exceeded: ${current}/${limit}`,
      'USAGE_LIMIT_EXCEEDED',
      403
    );
  }
}