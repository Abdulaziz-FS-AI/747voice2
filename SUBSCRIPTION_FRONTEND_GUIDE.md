# Voice Matrix Subscription Frontend Integration Guide

## Overview

The subscription frontend provides a complete user experience for managing plans, tracking usage, and handling payment flows. It seamlessly integrates with the Voice Matrix design system and provides real-time usage updates.

## Key Components

### 1. Subscription Context Provider (`/contexts/subscription-context.tsx`)

Wraps your app to provide global subscription state:

```tsx
// In app/layout.tsx
<AuthProvider>
  <SubscriptionProvider>
    {children}
  </SubscriptionProvider>
</AuthProvider>
```

**Features:**
- Auto-refreshes every 30 seconds
- Cross-tab synchronization
- Error handling with retry logic
- Loading states

### 2. Usage Display Components

#### UsageBar (`/components/subscription/usage-bar.tsx`)
Visual progress bar for minutes and assistants usage.

```tsx
<UsageBar 
  current={50}
  limit={100}
  type="minutes"
  compact={false}
/>
```

**Props:**
- `current`: Current usage count
- `limit`: Maximum allowed
- `type`: 'minutes' | 'assistants'
- `compact`: Minimal view mode
- `showLabels`: Show text labels

**Features:**
- Color-coded warnings (green → amber → red)
- Animated fill with shimmer effect
- Threshold markers at 80% and 90%

#### SubscriptionCard (`/components/subscription/subscription-card.tsx`)
Complete subscription overview widget.

```tsx
<SubscriptionCard variant="detailed" />
// or
<SubscriptionCard variant="compact" />
```

**Variants:**
- `detailed`: Full information with actions
- `compact`: Dashboard widget view

#### UsageWarningBanner (`/components/subscription/usage-warning-banner.tsx`)
Automatically displays warnings when approaching limits.

```tsx
// Add to dashboard layout
<UsageWarningBanner />
```

**Features:**
- Auto-shows at 80% (warning) and 90% (critical)
- Dismissible with memory
- Direct upgrade CTA for critical warnings

### 3. Upgrade/Downgrade Flows

#### UpgradeModal (`/components/subscription/upgrade-modal.tsx`)
Modal for upgrading when limits are hit.

```tsx
<UpgradeModal
  isOpen={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  triggerType="assistants" // or "minutes" or "general"
  currentUsage={{ type: 'assistants', current: 1, limit: 1 }}
/>
```

### 4. Usage Enforcement Hook

#### useEnforcedAction (`/hooks/use-enforced-action.tsx`)
Enforces limits before allowing actions.

```tsx
const { executeAction, UpgradeModal } = useEnforcedAction({
  actionType: 'assistants',
  onSuccess: async () => {
    // Create assistant
  }
});

// In your component
const handleCreate = async () => {
  const canProceed = await executeAction();
  if (!canProceed) return; // Modal shown
  // Continue with action
};

// In JSX
<UpgradeModal />
```

## Integration Patterns

### 1. Dashboard Integration

```tsx
// app/dashboard/page.tsx
import { SubscriptionCard } from '@/components/subscription/subscription-card';

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Compact view for dashboard */}
      <SubscriptionCard variant="compact" />
      
      {/* Rest of dashboard */}
    </DashboardLayout>
  );
}
```

### 2. Form Protection

```tsx
// components/assistants/create-assistant-form.tsx
import { useEnforcedAction } from '@/hooks/use-enforced-action';

export function CreateAssistantForm() {
  const { executeAction, UpgradeModal } = useEnforcedAction({
    actionType: 'assistants',
    onSuccess: () => {}
  });

  const onSubmit = async (data) => {
    const canProceed = await executeAction();
    if (!canProceed) return;
    
    // Create assistant
  };

  return (
    <>
      <UpgradeModal />
      <form onSubmit={onSubmit}>
        {/* Form fields */}
      </form>
    </>
  );
}
```

### 3. Real-time Usage Display

```tsx
// components/my-component.tsx
import { useSubscription } from '@/contexts/subscription-context';

export function MyComponent() {
  const { subscription, usage, loading } = useSubscription();

  if (loading) return <Skeleton />;

  return (
    <div>
      <p>Minutes: {usage.minutes.used}/{usage.minutes.limit}</p>
      <p>Days until reset: {usage.minutes.daysUntilReset}</p>
    </div>
  );
}
```

### 4. Conditional Features

```tsx
import { useSubscription } from '@/contexts/subscription-context';

export function PremiumFeature() {
  const { subscription } = useSubscription();
  
  if (subscription?.type !== 'pro') {
    return (
      <div className="locked-feature">
        <Lock />
        <p>Upgrade to Pro to unlock this feature</p>
        <UpgradeButton />
      </div>
    );
  }

  return <ActualFeature />;
}
```

## Billing Settings Page

The billing page (`/dashboard/settings/billing`) provides:

- Current plan details
- Usage analytics
- Plan comparison
- Upgrade/downgrade actions
- Billing history (Pro only)
- Stripe portal access

## Styling Guidelines

All components follow the Voice Matrix design system:

- **Colors**: Uses CSS variables (`--vm-*`)
- **Gradients**: `--vm-gradient-primary` for Pro features
- **States**: Consistent hover/active states
- **Animations**: Framer Motion for smooth transitions

## Error Handling

### Network Errors
```tsx
const { error } = useSubscription();

if (error) {
  return <ErrorState message={error} onRetry={refreshSubscription} />;
}
```

### Payment Failures
- Handled by Stripe checkout
- User redirected back with error params
- Toast notifications for feedback

### Usage Limit Errors
```tsx
try {
  await createAssistant();
} catch (error) {
  if (error.code === 'USAGE_LIMIT_EXCEEDED') {
    showUpgradeModal();
  }
}
```

## Testing Checklist

- [ ] Free user sees correct limits (1 assistant, 10 minutes)
- [ ] Pro user sees correct limits (10 assistants, 100 minutes)
- [ ] Usage bars update in real-time
- [ ] Warning banners appear at 80% and 90%
- [ ] Upgrade modal blocks actions when over limit
- [ ] Stripe checkout redirects properly
- [ ] Subscription updates after payment
- [ ] Cross-tab synchronization works
- [ ] Mobile responsive design
- [ ] Accessibility (keyboard nav, screen readers)

## Common Issues

### 1. Context Not Available
**Error**: "useSubscription must be used within SubscriptionProvider"
**Fix**: Ensure SubscriptionProvider wraps your component tree

### 2. Stale Usage Data
**Issue**: Usage not updating after actions
**Fix**: Call `refreshSubscription()` after API calls

### 3. Stripe Redirect Loop
**Issue**: User stuck in checkout flow
**Fix**: Check success/cancel URLs in checkout session

### 4. Warning Banner Not Showing
**Issue**: No warnings despite high usage
**Fix**: Ensure UsageWarningBanner is in layout above content

## Environment Variables

Required for frontend:
```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## Performance Optimizations

1. **Subscription Context** caches data for 30 seconds
2. **Usage calculations** are memoized
3. **Animations** use GPU-accelerated transforms
4. **Icons** are lazy-loaded from Lucide React
5. **Modals** use portal rendering

## Accessibility

- All interactive elements have keyboard support
- ARIA labels on progress bars
- Focus management in modals
- Color contrast meets WCAG AA standards
- Screen reader announcements for warnings