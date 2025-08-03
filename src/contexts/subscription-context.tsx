'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UsageDetails, UsageContextType } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage data
  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/usage');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch usage data');
      }

      setProfile(data.data.profile);
      setUsage(data.data.usage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Usage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load only - NO AUTO REFRESH for performance
  useEffect(() => {
    fetchUsage();

    // Listen for usage updates from other tabs only
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'usage-updated') {
        fetchUsage();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchUsage]);

  const value: UsageContextType = {
    profile,
    usage,
    loading,
    error,
    refreshUsage: fetchUsage,
  };

  return (
    <UsageContext.Provider value={value}>
      {children}
    </UsageContext.Provider>
  );
}

// Hook to use usage context
export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}

// Utility hook for checking limits
export function useCanPerformAction(actionType: 'assistants' | 'minutes') {
  const { profile, usage } = useUsage();

  if (!profile || !usage) {
    return { canPerform: false, reason: 'Loading usage data...' };
  }

  if (actionType === 'assistants') {
    const canPerform = usage.assistants.count < usage.assistants.limit;
    const reason = !canPerform 
      ? `You've reached your limit of ${usage.assistants.limit} assistant${usage.assistants.limit > 1 ? 's' : ''}.`
      : null;
    return { canPerform, reason };
  }

  if (actionType === 'minutes') {
    const canPerform = usage.minutes.used < usage.minutes.limit;
    const reason = !canPerform
      ? `You've used all ${usage.minutes.limit} minutes this month.`
      : null;
    return { canPerform, reason };
  }

  return { canPerform: true, reason: null };
}

// Hook for usage warnings
export function useUsageWarnings() {
  const { usage } = useUsage();
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
      message: `Critical: You've used ${usage.minutes.percentage.toFixed(0)}% of your monthly minutes`
    });
  } else if (usage.minutes.percentage >= 80) {
    warnings.push({
      type: 'minutes' as const,
      level: 'warning' as const,
      percentage: usage.minutes.percentage,
      message: `Warning: You've used ${usage.minutes.percentage.toFixed(0)}% of your monthly minutes`
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