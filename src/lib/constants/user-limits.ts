// Basic user limits - applied to all users
export const USER_LIMITS = {
  MAX_ASSISTANTS: 3,
  MAX_MINUTES_MONTHLY: 10,
} as const;

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

// Helper functions for usage limits
export function getUserLimits() {
  return {
    maxAssistants: USER_LIMITS.MAX_ASSISTANTS,
    maxMinutesMonthly: USER_LIMITS.MAX_MINUTES_MONTHLY
  };
}

export function checkUsageWarning(used: number, limit: number, type: 'minutes' | 'assistants') {
  const percentage = used / limit;
  const threshold = USAGE_WARNING_THRESHOLDS[type];
  
  if (percentage >= threshold.critical) {
    return { level: 'critical' as const, percentage };
  } else if (percentage >= threshold.warning) {
    return { level: 'warning' as const, percentage };
  }
  
  return null;
}