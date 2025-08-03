'use client'

import { useState } from 'react';
import { useCanPerformAction } from '@/contexts/subscription-context';
import { toast } from '@/hooks/use-toast';

interface UseEnforcedActionOptions {
  actionType: 'assistants' | 'minutes';
  onSuccess: () => void | Promise<void>;
  customMessage?: string;
}

export function useEnforcedAction({ 
  actionType, 
  onSuccess,
  customMessage 
}: UseEnforcedActionOptions) {
  const { canPerform, reason } = useCanPerformAction(actionType);

  const executeAction = async () => {
    if (!canPerform) {
      toast({
        title: 'Limit Reached',
        description: reason || `You've reached your ${actionType} limit.`,
        variant: 'destructive'
      });
      return false;
    }

    try {
      await onSuccess();
      return true;
    } catch (error) {
      console.error('Action failed:', error);
      throw error;
    }
  };

  return {
    executeAction,
    canPerform,
    reason: customMessage || reason,
  };
}