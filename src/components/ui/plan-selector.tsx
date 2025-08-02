'use client'

import { motion } from 'framer-motion'
import { Check, Zap, Users, Clock, Star, ArrowRight } from 'lucide-react'
import { SUBSCRIPTION_PLANS, SubscriptionType } from '@/types/subscription'

interface PlanSelectorProps {
  selectedPlan: SubscriptionType
  onPlanSelect: (plan: SubscriptionType) => void
  onPlanContinue?: (plan: SubscriptionType) => void
  className?: string
}

export function PlanSelector({ selectedPlan, onPlanSelect, onPlanContinue, className = '' }: PlanSelectorProps) {
  const planFeatures = {
    free: [
      'Create 1 AI voice assistant',
      '10 minutes of calls per month',
      'Basic voice customization',
      'Community support',
      'Dashboard analytics'
    ],
    pro: [
      'Create up to 10 AI assistants',
      '100 minutes of calls per month',
      'Advanced voice customization',
      'Priority support & live chat',
      'Advanced analytics & reporting',
      'Custom integrations',
      'API access',
      'White-label options'
    ]
  }


  return (
    <div className={`w-full ${className}`}>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative vm-card p-8 cursor-pointer transition-all duration-300 ${
            selectedPlan === 'free' 
              ? 'ring-2 scale-105 vm-glow' 
              : 'hover:scale-105'
          }`}
          style={{ 
            ...(selectedPlan === 'free' && { '--tw-ring-color': 'var(--vm-primary)' } as any)
          }}
          onClick={() => onPlanSelect('free')}
        >
          {selectedPlan === 'free' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--vm-gradient-primary)' }}
            >
              <Check className="h-4 w-4 text-white" />
            </motion.div>
          )}

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full mb-4"
                 style={{ background: 'var(--vm-surface-elevated)' }}>
              <Users className="h-8 w-8 vm-text-primary" />
            </div>
            <h3 className="vm-heading text-xl font-bold mb-2">Free Plan</h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold vm-text-primary">$0</span>
              <span className="vm-text-muted text-sm">/month</span>
            </div>
            <p className="vm-text-muted text-sm mt-2">Perfect for getting started</p>
          </div>

          <ul className="space-y-3 mb-8">
            {planFeatures.free.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                     style={{ background: 'var(--vm-accent)' }}>
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="vm-text-primary text-sm">{feature}</span>
              </motion.li>
            ))}
          </ul>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              console.log('🔥 Free plan button clicked!')
              onPlanSelect('free')
              console.log('🔥 Calling onPlanContinue with free')
              onPlanContinue?.('free')
            }}
            className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 vm-button-primary flex items-center justify-center gap-2"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`relative vm-card p-8 cursor-pointer transition-all duration-300 ${
            selectedPlan === 'pro' 
              ? 'ring-2 scale-105 vm-glow' 
              : 'hover:scale-105'
          }`}
          style={{ 
            ...(selectedPlan === 'pro' && { '--tw-ring-color': 'var(--vm-primary)' } as any)
          }}
          onClick={() => onPlanSelect('pro')}
        >
          {/* Popular Badge */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-1 px-4 py-2 rounded-full text-white text-sm font-medium"
                 style={{ background: 'var(--vm-gradient-primary)' }}>
              <Star className="h-4 w-4" />
              Most Popular
            </div>
          </div>

          {selectedPlan === 'pro' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--vm-gradient-primary)' }}
            >
              <Check className="h-4 w-4 text-white" />
            </motion.div>
          )}

          <div className="text-center mb-6 mt-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full mb-4"
                 style={{ background: 'var(--vm-gradient-primary)' }}>
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="vm-heading text-xl font-bold mb-2">Pro Plan</h3>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold vm-text-primary">
                ${SUBSCRIPTION_PLANS.pro.price}
              </span>
              <span className="vm-text-muted text-sm">/month</span>
            </div>
            <p className="vm-text-muted text-sm mt-2">For power users & businesses</p>
          </div>

          <ul className="space-y-3 mb-8">
            {planFeatures.pro.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center"
                     style={{ background: 'var(--vm-gradient-primary)' }}>
                  <Check className="h-3 w-3 text-white" />
                </div>
                <span className="vm-text-primary text-sm">{feature}</span>
              </motion.li>
            ))}
          </ul>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              console.log('🔥 Pro plan button clicked!')
              onPlanSelect('pro')
              console.log('🔥 Calling onPlanContinue with pro')
              onPlanContinue?.('pro')
            }}
            className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 vm-button-primary flex items-center justify-center gap-2"
          >
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center mt-8 space-y-2"
      >
        <p className="vm-text-muted text-sm">
          🔒 Secure payment • 30-day money back guarantee • Cancel anytime
        </p>
        <div className="flex items-center justify-center gap-4 text-xs vm-text-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Setup in 2 minutes
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Join 1000+ satisfied users
          </span>
        </div>
      </motion.div>
    </div>
  )
}