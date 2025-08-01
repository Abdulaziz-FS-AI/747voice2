'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscription } from '@/contexts/subscription-context';
import { SubscriptionCard } from '@/components/subscription/subscription-card';
import { UsageBar } from '@/components/subscription/usage-bar';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { UpgradeButton } from '@/components/subscription/upgrade-button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { 
  CreditCard, 
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Receipt,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function BillingSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    subscription, 
    usage, 
    loading, 
    upgradeToProPlan, 
    downgradeToFreePlan,
    cancelSubscription,
    refreshSubscription
  } = useSubscription();
  const [managingBilling, setManagingBilling] = useState(false);
  const [downloadingInvoices, setDownloadingInvoices] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check for success/cancel params
  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    
    if (success === 'true') {
      toast({
        title: 'Welcome to Pro!',
        description: 'Your subscription has been activated successfully.',
      });
      // Clear the URL params
      router.replace('/dashboard/settings/billing');
      // Refresh subscription data
      refreshSubscription();
    } else if (cancelled === 'true') {
      toast({
        title: 'Upgrade Cancelled',
        description: 'You cancelled the upgrade process.',
      });
      // Clear the URL params
      router.replace('/dashboard/settings/billing');
    }
  }, [searchParams, router, refreshSubscription]);

  // Fetch payment history for Pro users
  useEffect(() => {
    if (subscription?.type === 'pro') {
      fetchPaymentHistory();
    }
  }, [subscription?.type]);

  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await fetch('/api/subscription/payment-history');
      const data = await response.json();
      
      if (response.ok) {
        setPaymentHistory(data.data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setManagingBilling(true);
      
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to open billing portal');
      }

      // Redirect to PayPal account management
      window.location.href = data.data.url;
    } catch (error) {
      console.error('Billing portal error:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setManagingBilling(false);
    }
  };

  const handleDownloadInvoices = async () => {
    try {
      setDownloadingInvoices(true);
      
      // TODO: Implement invoice download
      toast({
        title: 'Coming Soon',
        description: 'Invoice download will be available soon.',
      });
    } finally {
      setDownloadingInvoices(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    try {
      setCancellingSubscription(true);
      await cancelSubscription();
      toast({
        title: 'Subscription Cancelled',
        description: 'You will retain Pro features until the end of your billing period.',
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/subscription/invoice/${paymentId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate invoice');
      }
      
      // TODO: Implement PDF download
      toast({
        title: 'Invoice Generated',
        description: 'Invoice download will be available soon.',
      });
    } catch (error) {
      console.error('Invoice download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download invoice. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (!subscription || !usage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--vm-secondary-purple)' }} />
        </div>
      </DashboardLayout>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS[subscription.type];
  const isProUser = subscription.type === 'pro';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
            Billing & Subscription
          </h1>
          <p className="text-lg mt-2" style={{ color: 'var(--vm-text-muted)' }}>
            Manage your subscription plan and billing details
          </p>
        </motion.div>

        {/* Main Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <SubscriptionCard variant="detailed" />
        </motion.div>

        {/* Billing Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Tabs defaultValue="plan" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="plan">Plan Details</TabsTrigger>
              <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
              <TabsTrigger value="billing">Billing History</TabsTrigger>
            </TabsList>

            {/* Plan Details Tab */}
            <TabsContent value="plan" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan Card */}
                <Card style={{ 
                  backgroundColor: 'var(--vm-primary-surface)',
                  borderColor: isProUser ? 'var(--vm-secondary-purple)' : 'var(--vm-border-default)'
                }}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                        Current Plan
                      </CardTitle>
                      <Badge 
                        variant={isProUser ? 'default' : 'secondary'}
                        style={{
                          background: isProUser 
                            ? 'var(--vm-gradient-primary)' 
                            : 'rgba(139, 92, 246, 0.1)',
                          color: isProUser ? '#FFFFFF' : 'var(--vm-secondary-purple)'
                        }}
                      >
                        {currentPlan.name}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--vm-text-muted)' }}>Monthly Cost</span>
                        <span className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                          ${currentPlan.price}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                          <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                            {currentPlan.features.maxAssistants} AI Assistant{currentPlan.features.maxAssistants > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                          <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                            {currentPlan.features.maxMinutesMonthly} minutes per month
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                          <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                            {currentPlan.features.supportLevel === 'priority' ? 'Priority' : 'Community'} support
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      {isProUser ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleManageBilling}
                            disabled={managingBilling}
                          >
                            {managingBilling ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CreditCard className="mr-2 h-4 w-4" />
                            )}
                            Manage Billing
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={handleCancelSubscription}
                            disabled={cancellingSubscription || subscription.status === 'cancelled'}
                          >
                            {cancellingSubscription ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {subscription.status === 'cancelled' ? 'Subscription Cancelled' : 'Cancel Subscription'}
                          </Button>
                        </>
                      ) : (
                        <UpgradeButton className="w-full" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Cycle Card */}
                <Card style={{ 
                  backgroundColor: 'var(--vm-primary-surface)',
                  borderColor: 'var(--vm-border-default)'
                }}>
                  <CardHeader>
                    <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                      Billing Cycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--vm-text-muted)' }}>Current Period</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                          {new Date(subscription.billingCycleStart).toLocaleDateString()} - {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--vm-text-muted)' }}>Next Reset</span>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" style={{ color: 'var(--vm-accent-blue)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                            {usage.minutes.daysUntilReset} days
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--vm-text-muted)' }}>Status</span>
                        <Badge 
                          variant={subscription.status === 'active' ? 'default' : 'secondary'}
                          style={{
                            backgroundColor: subscription.status === 'active' 
                              ? 'rgba(16, 185, 129, 0.1)' 
                              : 'rgba(239, 68, 68, 0.1)',
                            color: subscription.status === 'active' 
                              ? 'var(--vm-success-green)' 
                              : 'var(--vm-error-red)',
                            border: 'none'
                          }}
                        >
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>

                    {subscription.status === 'cancelled' && (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <p className="text-sm" style={{ color: 'var(--vm-error-red)' }}>
                          Your subscription will end on {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Plan Comparison */}
              <Card style={{ 
                backgroundColor: 'var(--vm-primary-surface)',
                borderColor: 'var(--vm-border-default)'
              }}>
                <CardHeader>
                  <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                    Compare Plans
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                    Choose the plan that best fits your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                      <div
                        key={plan.id}
                        className="relative p-6 rounded-xl border-2 transition-all"
                        style={{
                          backgroundColor: plan.id === subscription.type 
                            ? 'rgba(139, 92, 246, 0.05)' 
                            : 'var(--vm-neutral-800)',
                          borderColor: plan.id === subscription.type 
                            ? 'var(--vm-secondary-purple)' 
                            : 'var(--vm-border-subtle)'
                        }}
                      >
                        {plan.id === subscription.type && (
                          <Badge 
                            className="absolute -top-3 -right-3"
                            style={{
                              background: 'var(--vm-gradient-primary)',
                              color: '#FFFFFF'
                            }}
                          >
                            Current
                          </Badge>
                        )}
                        
                        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--vm-text-primary)' }}>
                          {plan.name}
                        </h3>
                        
                        <p className="text-3xl font-bold mb-4" style={{ color: 'var(--vm-text-primary)' }}>
                          ${plan.price}
                          <span className="text-sm font-normal" style={{ color: 'var(--vm-text-muted)' }}>
                            /month
                          </span>
                        </p>
                        
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                            <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                              {plan.features.maxAssistants} AI Assistant{plan.features.maxAssistants > 1 ? 's' : ''}
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                            <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                              {plan.features.maxMinutesMonthly} minutes/month
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" style={{ color: 'var(--vm-success-green)' }} />
                            <span className="text-sm" style={{ color: 'var(--vm-text-primary)' }}>
                              {plan.features.supportLevel === 'priority' ? 'Priority' : 'Community'} support
                            </span>
                          </li>
                        </ul>
                        
                        {plan.id !== subscription.type && (
                          <Button
                            className="w-full mt-4"
                            variant={plan.id === 'pro' ? 'default' : 'outline'}
                            onClick={plan.id === 'pro' ? undefined : downgradeToFreePlan}
                            asChild={plan.id === 'pro'}
                          >
                            {plan.id === 'pro' ? (
                              <UpgradeButton className="w-full">
                                Upgrade to {plan.name}
                              </UpgradeButton>
                            ) : (
                              <span>Downgrade to {plan.name}</span>
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Analytics Tab */}
            <TabsContent value="usage" className="space-y-6">
              <Card style={{ 
                backgroundColor: 'var(--vm-primary-surface)',
                borderColor: 'var(--vm-border-default)'
              }}>
                <CardHeader>
                  <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                    Current Usage
                  </CardTitle>
                  <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                    Track your resource consumption this billing cycle
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--vm-text-primary)' }}>
                        Minutes Usage
                      </h4>
                      <UsageBar 
                        current={usage.minutes.used}
                        limit={usage.minutes.limit}
                        type="minutes"
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--vm-text-primary)' }}>
                        AI Assistants
                      </h4>
                      <UsageBar 
                        current={usage.assistants.count}
                        limit={usage.assistants.limit}
                        type="assistants"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 pt-4 border-t"
                       style={{ borderColor: 'var(--vm-border-subtle)' }}>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                        {usage.calls.totalThisMonth}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        Total Calls
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                        {usage.calls.successRate}%
                      </p>
                      <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        Success Rate
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                        {usage.calls.averageDuration}min
                      </p>
                      <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                        Avg Duration
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing History Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card style={{ 
                backgroundColor: 'var(--vm-primary-surface)',
                borderColor: 'var(--vm-border-default)'
              }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle style={{ color: 'var(--vm-text-primary)' }}>
                        Billing History
                      </CardTitle>
                      <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                        View and download your past invoices
                      </CardDescription>
                    </div>
                    {isProUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadInvoices}
                        disabled={downloadingInvoices}
                      >
                        {downloadingInvoices ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isProUser ? (
                    loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--vm-secondary-purple)' }} />
                      </div>
                    ) : paymentHistory.length > 0 ? (
                      <div className="space-y-3">
                        {paymentHistory.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--vm-neutral-800)',
                              borderColor: 'var(--vm-border-subtle)'
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <Receipt className="h-5 w-5" style={{ color: 'var(--vm-accent-blue)' }} />
                                <div>
                                  <p className="font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                                    {payment.description || 'Voice Matrix Pro Subscription'}
                                  </p>
                                  <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                                    {new Date(payment.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-medium" style={{ color: 'var(--vm-text-primary)' }}>
                                  ${payment.amount.toFixed(2)}
                                </p>
                                <Badge
                                  variant={payment.status === 'completed' ? 'default' : 'secondary'}
                                  style={{
                                    backgroundColor: payment.status === 'completed'
                                      ? 'rgba(16, 185, 129, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                    color: payment.status === 'completed'
                                      ? 'var(--vm-success-green)'
                                      : 'var(--vm-error-red)',
                                    border: 'none'
                                  }}
                                >
                                  {payment.status}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadInvoice(payment.transaction_id)}
                                title="Download Invoice"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t" style={{ borderColor: 'var(--vm-border-subtle)' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleManageBilling}
                            className="w-full"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Manage in PayPal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Receipt className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--vm-text-muted)' }} />
                        <p style={{ color: 'var(--vm-text-muted)' }}>
                          Billing history will appear here after your first payment
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4"
                          onClick={handleManageBilling}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View in PayPal
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--vm-text-muted)' }} />
                      <p style={{ color: 'var(--vm-text-muted)' }}>
                        Upgrade to Pro to access billing history
                      </p>
                      <UpgradeButton className="mt-4" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}