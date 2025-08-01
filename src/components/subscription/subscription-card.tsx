'use client'

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/contexts/subscription-context';
import { UsageBar } from './usage-bar';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { 
  Zap, 
  Clock, 
  Brain,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SubscriptionCardProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function SubscriptionCard({ 
  className = '', 
  variant = 'detailed' 
}: SubscriptionCardProps) {
  const router = useRouter();
  const { subscription, usage, loading, error, upgradeToProPlan } = useSubscription();

  if (loading) {
    return (
      <Card className={className} style={{ 
        backgroundColor: 'var(--vm-primary-surface)',
        borderColor: 'var(--vm-border-default)'
      }}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subscription || !usage) {
    return (
      <Card className={className} style={{ 
        backgroundColor: 'var(--vm-primary-surface)',
        borderColor: 'var(--vm-border-default)'
      }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" style={{ color: 'var(--vm-error-red)' }} />
            <p style={{ color: 'var(--vm-text-muted)' }}>
              {error || 'Unable to load subscription data'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const plan = SUBSCRIPTION_PLANS[subscription.type];
  const daysUntilReset = usage.minutes.daysUntilReset;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] ${className}`}
          style={{ 
            backgroundColor: 'var(--vm-primary-surface)',
            borderColor: 'var(--vm-border-default)'
          }}
          onClick={() => router.push('/dashboard/settings/billing')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    background: subscription.type === 'pro' 
                      ? 'var(--vm-gradient-primary)' 
                      : 'rgba(139, 92, 246, 0.1)'
                  }}
                >
                  <Zap className="h-4 w-4" style={{ color: '#FFFFFF' }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
                    {plan.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                    {daysUntilReset} days until reset
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" style={{ color: 'var(--vm-text-muted)' }} />
            </div>
            
            <div className="space-y-3">
              <UsageBar 
                current={usage.minutes.used}
                limit={usage.minutes.limit}
                type="minutes"
                compact
              />
              <UsageBar 
                current={usage.assistants.count}
                limit={usage.assistants.limit}
                type="assistants"
                compact
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className={className} style={{ 
        backgroundColor: 'var(--vm-primary-surface)',
        borderColor: 'var(--vm-border-default)'
      }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                Your Subscription
              </CardTitle>
              <Badge 
                variant={subscription.type === 'pro' ? 'default' : 'secondary'}
                style={{
                  background: subscription.type === 'pro' 
                    ? 'var(--vm-gradient-primary)' 
                    : 'rgba(139, 92, 246, 0.1)',
                  color: subscription.type === 'pro' ? '#FFFFFF' : 'var(--vm-secondary-purple)',
                  border: 'none'
                }}
              >
                {plan.name}
              </Badge>
            </div>
            
            {subscription.type === 'free' && (
              <Button
                size="sm"
                onClick={upgradeToProPlan}
                style={{
                  background: 'var(--vm-gradient-primary)',
                  color: '#FFFFFF'
                }}
              >
                <Zap className="mr-2 h-3 w-3" />
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Usage Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--vm-neutral-800)',
                borderColor: 'var(--vm-border-subtle)'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" style={{ color: 'var(--vm-accent-blue)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                  Minutes Usage
                </span>
              </div>
              <UsageBar 
                current={usage.minutes.used}
                limit={usage.minutes.limit}
                type="minutes"
                showLabels={false}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--vm-text-muted)' }}>
                {usage.minutes.limit - usage.minutes.used} minutes remaining
              </p>
            </div>

            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--vm-neutral-800)',
                borderColor: 'var(--vm-border-subtle)'
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                  AI Assistants
                </span>
              </div>
              <UsageBar 
                current={usage.assistants.count}
                limit={usage.assistants.limit}
                type="assistants"
                showLabels={false}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--vm-text-muted)' }}>
                {usage.assistants.limit - usage.assistants.count} slots available
              </p>
            </div>
          </div>

          {/* Call Statistics */}
          <div className="flex items-center justify-between p-4 rounded-lg"
               style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--vm-secondary-purple)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                  {usage.calls.totalThisMonth} calls this month
                </p>
                <p className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
                  {usage.calls.successRate}% success rate • {usage.calls.averageDuration}min avg
                </p>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="flex items-center justify-between pt-4 border-t"
               style={{ borderColor: 'var(--vm-border-subtle)' }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ color: 'var(--vm-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                Resets in {daysUntilReset} days
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/settings/billing')}
              className="hover:bg-white/5"
            >
              <CreditCard className="mr-2 h-3 w-3" />
              Manage Billing
            </Button>
          </div>

          {/* Upgrade CTA for Free users */}
          {subscription.type === 'free' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: 'rgba(139, 92, 246, 0.05)',
                borderColor: 'rgba(139, 92, 246, 0.2)'
              }}
            >
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--vm-text-primary)' }}>
                🚀 Unlock Pro Features
              </p>
              <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--vm-text-muted)' }}>
                <li>• 10x more assistants (10 total)</li>
                <li>• 10x more minutes (100 per month)</li>
                <li>• Priority support</li>
                <li>• Advanced analytics</li>
              </ul>
              <Button
                size="sm"
                className="w-full"
                onClick={upgradeToProPlan}
                style={{
                  background: 'var(--vm-gradient-primary)',
                  color: '#FFFFFF'
                }}
              >
                Upgrade for $25/month
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}