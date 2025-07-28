// Simplified single-tier pricing configuration

export const PRICING = {
  FREE_TIER: {
    name: 'Free',
    price: 0,
    maxAssistants: 1,
    maxMinutes: 100,
    maxPhoneNumbers: 0, // No phone numbers in free tier
    features: [
      '1 AI Assistant',
      '100 minutes/month',
      'Basic analytics',
      'Email support'
    ]
  },
  PREMIUM_TIER: {
    name: 'Premium',
    price: 29, // $29/month
    priceId: 'price_premium_monthly', // Stripe price ID
    maxAssistants: 10,
    maxMinutes: 2000,
    maxPhoneNumbers: 5,
    features: [
      '10 AI Assistants',
      '2,000 minutes/month',
      '5 Phone Numbers',
      'Advanced analytics',
      'Lead management',
      'Call transcripts',
      'Priority support',
      'Custom prompts'
    ]
  }
} as const;

export type PricingTier = typeof PRICING[keyof typeof PRICING];

// Get user's tier configuration
export function getUserTierConfig(isPremium: boolean): PricingTier {
  return isPremium ? PRICING.PREMIUM_TIER : PRICING.FREE_TIER;
}

// Check if feature is available for user
export function hasFeatureAccess(isPremium: boolean, feature: string): boolean {
  const userTier = getUserTierConfig(isPremium);
  return userTier.features.includes(feature);
}

// Get upgrade message for limit exceeded
export function getUpgradeMessage(resource: string): string {
  switch (resource) {
    case 'assistants':
      return 'Upgrade to Premium to create up to 10 AI assistants and unlock advanced features.';
    case 'minutes':
      return 'Upgrade to Premium for 2,000 minutes per month and unlimited call history.';
    case 'phone_numbers':
      return 'Upgrade to Premium to get your own phone numbers and receive inbound calls.';
    default:
      return 'Upgrade to Premium to unlock all features and higher limits.';
  }
}

// Stripe configuration
export const STRIPE_CONFIG = {
  PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly',
  SUCCESS_URL: `${process.env.NEXT_PUBLIC_URL}/dashboard?payment=success`,
  CANCEL_URL: `${process.env.NEXT_PUBLIC_URL}/pricing?payment=cancelled`,
} as const;