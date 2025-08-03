// Simple user profile types - no subscription tiers
export interface UserProfile {
  userId: string;
  currentUsageMinutes: number;
  maxMinutesMonthly: number;
  currentAssistantCount: number;
  maxAssistants: number;
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

export interface UsageContextType {
  profile: UserProfile | null;
  usage: UsageDetails | null;
  loading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
}

export interface UsageWarning {
  type: 'minutes' | 'assistants';
  level: 'warning' | 'critical';
  percentage: number;
  message: string;
}