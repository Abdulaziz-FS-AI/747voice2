'use client'

import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { useSubscription } from '@/contexts/subscription-context';
import { 
  Zap, 
  Check, 
  X,
  Brain,
  Clock,
  Headphones,
  Shield,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerType?: 'assistants' | 'minutes' | 'general';
  currentUsage?: {
    type: 'assistants' | 'minutes';
    current: number;
    limit: number;
  };
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  triggerType = 'general',
  currentUsage 
}: UpgradeModalProps) {
  const { upgradeToProPlan, loading } = useSubscription();

  const handleUpgrade = async () => {
    await upgradeToProPlan();
    // Modal will close automatically when redirecting to Stripe
  };

  const getModalContent = () => {
    if (triggerType === 'assistants') {
      return {
        title: "You've Reached Your Assistant Limit",
        description: "Upgrade to Pro to create up to 10 AI assistants and unlock advanced features.",
        icon: Brain,
        iconColor: 'var(--vm-secondary-purple)'
      };
    }

    if (triggerType === 'minutes') {
      return {
        title: "You're Out of Minutes",
        description: "Upgrade to Pro for 100 minutes per month and keep your assistants running.",
        icon: Clock,
        iconColor: 'var(--vm-accent-blue)'
      };
    }

    return {
      title: "Unlock Voice Matrix Pro",
      description: "Get 10x more resources and premium features to scale your AI voice operations.",
      icon: Zap,
      iconColor: 'var(--vm-warning-amber)'
    };
  };

  const content = getModalContent();
  const freePlan = SUBSCRIPTION_PLANS.free;
  const proPlan = SUBSCRIPTION_PLANS.pro;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent 
            className="sm:max-w-2xl p-0 overflow-hidden border"
            style={{ 
              backgroundColor: 'var(--vm-primary-surface)',
              borderColor: 'var(--vm-border-default)'
            }}
          >
            {/* Header with gradient background */}
            <div 
              className="relative p-6 pb-4"
              style={{ 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)'
              }}
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="p-3 rounded-xl"
                    style={{ 
                      background: 'var(--vm-gradient-primary)',
                      boxShadow: 'var(--vm-shadow-brand)'
                    }}
                  >
                    <content.icon className="h-6 w-6 text-white" />
                  </motion.div>
                  <div>
                    <DialogTitle className="text-xl" style={{ color: 'var(--vm-text-primary)' }}>
                      {content.title}
                    </DialogTitle>
                    <DialogDescription style={{ color: 'var(--vm-text-muted)' }}>
                      {content.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Current usage display */}
              {currentUsage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--vm-text-muted)' }}>Current Usage</span>
                    <span className="font-bold" style={{ color: content.iconColor }}>
                      {currentUsage.current} / {currentUsage.limit} {currentUsage.type}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Plans comparison */}
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Free Plan */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative p-4 rounded-xl border"
                  style={{ 
                    backgroundColor: 'var(--vm-neutral-800)',
                    borderColor: 'var(--vm-border-subtle)'
                  }}
                >
                  <Badge 
                    className="absolute -top-2 -right-2"
                    variant="secondary"
                  >
                    Current
                  </Badge>
                  
                  <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--vm-text-primary)' }}>
                    {freePlan.name}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-gray-400" />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        {freePlan.features.maxAssistants} AI Assistant
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-gray-400" />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        {freePlan.features.maxMinutesMonthly} minutes/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-gray-400" />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        Community support
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--vm-border-subtle)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                      $0<span className="text-sm font-normal" style={{ color: 'var(--vm-text-muted)' }}>/month</span>
                    </p>
                  </div>
                </motion.div>

                {/* Pro Plan */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative p-4 rounded-xl border-2"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                    borderColor: 'var(--vm-secondary-purple)'
                  }}
                >
                  <Badge 
                    className="absolute -top-2 -right-2"
                    style={{
                      background: 'var(--vm-gradient-primary)',
                      color: '#FFFFFF'
                    }}
                  >
                    Recommended
                  </Badge>
                  
                  <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--vm-text-primary)' }}>
                    {proPlan.name}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--vm-gradient-primary)' }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                        {proPlan.features.maxAssistants} AI Assistants
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--vm-gradient-primary)' }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                        {proPlan.features.maxMinutesMonthly} minutes/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--vm-gradient-primary)' }}
                      >
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                        Priority support
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                      ${proPlan.price}<span className="text-sm font-normal" style={{ color: 'var(--vm-text-muted)' }}>/month</span>
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Additional Pro features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}
              >
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--vm-text-primary)' }}>
                  Pro Plan Benefits
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
                    <span className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                      Advanced analytics
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
                    <span className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                      Enhanced security
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
                    <span className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                      24/7 support
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
                    <span className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                      Priority processing
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  style={{
                    background: 'var(--vm-gradient-primary)',
                    color: '#FFFFFF',
                    minWidth: '140px'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}