'use client'

import { useState } from 'react';
import { useCanPerformAction } from '@/contexts/subscription-context';
import { UpgradeModal } from '@/components/subscription/upgrade-modal';

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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const { canPerform, reason } = useCanPerformAction(actionType);

  const executeAction = async () => {
    if (!canPerform) {
      setIsUpgradeModalOpen(true);
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

  const UpgradeModalComponent = () => (
    <UpgradeModal
      isOpen={isUpgradeModalOpen}
      onClose={() => setIsUpgradeModalOpen(false)}
      triggerType={actionType}
      currentUsage={
        reason ? {
          type: actionType,
          current: parseInt(reason.match(/\d+/)?.[0] || '0'),
          limit: parseInt(reason.match(/\d+/g)?.[1] || '0')
        } : undefined
      }
    />
  );

  return {
    executeAction,
    canPerform,
    reason: customMessage || reason,
    UpgradeModal: UpgradeModalComponent
  };
}