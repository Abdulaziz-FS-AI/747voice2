'use client'

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/contexts/subscription-context';
import { Loader2, AlertTriangle, Calendar } from 'lucide-react';

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CANCEL_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using_enough', label: 'Not using the service enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'found_alternative', label: 'Found a better alternative' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'other', label: 'Other reason' }
];

export function CancelSubscriptionModal({ 
  open, 
  onOpenChange 
}: CancelSubscriptionModalProps) {
  const { subscription, cancelSubscription } = useSubscription();
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      
      // Call the API to cancel subscription
      const response = await fetch('/api/subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason,
          feedback: feedback.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to cancel subscription');
      }

      // Close modal
      onOpenChange(false);
      
      // The context will handle the success toast and data refresh
      await cancelSubscription();
    } catch (error) {
      console.error('Cancel subscription error:', error);
    } finally {
      setCancelling(false);
    }
  };

  if (!subscription) return null;

  const billingEndDate = new Date(subscription.billingCycleEnd).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancel Pro Subscription
          </DialogTitle>
          <DialogDescription>
            We're sorry to see you go. Your feedback helps us improve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Retention Info */}
          <Alert className="border-amber-200 bg-amber-50">
            <Calendar className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              You'll keep your Pro features until <strong>{billingEndDate}</strong>. 
              After that, your account will automatically switch to the Free plan.
            </AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="space-y-3">
            <Label>Why are you cancelling? (Optional)</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {CANCEL_REASONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label 
                    htmlFor={option.value} 
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Feedback */}
          {reason && (
            <div className="space-y-2">
              <Label htmlFor="feedback">
                {reason === 'other' 
                  ? 'Please tell us more' 
                  : 'Any additional feedback? (Optional)'}
              </Label>
              <Textarea
                id="feedback"
                placeholder="Your feedback helps us improve Voice Matrix..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* What happens next */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">What happens when you cancel:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>You'll retain Pro features until {billingEndDate}</li>
              <li>No more charges after your current billing period</li>
              <li>Your account will switch to Free plan automatically</li>
              <li>Assistants exceeding Free limits will be deactivated</li>
              <li>You can resubscribe anytime to restore Pro features</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelling}
          >
            Keep My Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling || (reason === 'other' && !feedback.trim())}
          >
            {cancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Standalone cancel button
export function CancelSubscriptionButton({ 
  className 
}: { 
  className?: string 
}) {
  const [showModal, setShowModal] = useState(false);
  const { subscription } = useSubscription();

  // Only show for active Pro users
  if (subscription?.type !== 'pro' || subscription?.status !== 'active') {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        className={className}
        onClick={() => setShowModal(true)}
      >
        Cancel Subscription
      </Button>
      
      <CancelSubscriptionModal 
        open={showModal} 
        onOpenChange={setShowModal} 
      />
    </>
  );
}