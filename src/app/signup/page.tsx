'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Mic, Zap, Mail, UserPlus, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { PlanSelector } from '@/components/ui/plan-selector'
import { PayPalCheckout } from '@/components/ui/paypal-checkout'
import { SubscriptionType } from '@/types/subscription'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get plan from URL params (enforced routing)
  const planFromUrl = searchParams.get('plan') as SubscriptionType | null
  const stepFromUrl = searchParams.get('step') as 'plan' | 'details' | 'payment' | null
  const isQuickSignup = searchParams.get('quick') === 'true'
  
  const [step, setStep] = useState<'plan' | 'details' | 'payment'>(stepFromUrl || 'plan')
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(planFromUrl || 'free')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClientSupabaseClient()
  const { signInWithGoogle, user, loading } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // ROUTING PROTECTION: Enforce plan selection flow
  useEffect(() => {
    // Add a small delay to avoid interfering with programmatic navigation
    const timeout = setTimeout(() => {
      // If user tries to access details/payment step without selecting a plan
      if (step !== 'plan' && !planFromUrl && !selectedPlan) {
        console.log('🚫 Direct access blocked - redirecting to plan selection')
        router.replace('/signup?step=plan')
        setStep('plan')
      }
      
      // If user tries to access payment step without selecting Pro plan
      if (step === 'payment' && selectedPlan !== 'pro') {
        console.log('🚫 Payment access blocked - redirecting to details')
        router.replace(`/signup?plan=${selectedPlan}&step=details`)
        setStep('details')
      }
    }, 100) // Small delay to allow state updates
    
    return () => clearTimeout(timeout)
  }, [step, planFromUrl, selectedPlan, router])

  const handlePlanNext = (plan?: SubscriptionType) => {
    const planToUse = plan || selectedPlan
    console.log('🚀 handlePlanNext called with plan:', planToUse)
    console.log('🚀 Current step:', step)
    console.log('🚀 Router available:', !!router)
    
    try {
      // Update selected plan immediately if a specific plan was passed
      if (plan && plan !== selectedPlan) {
        console.log('🚀 Updating selected plan from', selectedPlan, 'to', plan)
        setSelectedPlan(plan)
      }
      
      const newUrl = `/signup?plan=${planToUse}&step=details`
      console.log('🚀 Navigating to:', newUrl)
      
      // Use replace instead of push to avoid issues with routing protection
      router.replace(newUrl)
      setStep('details')
      
      console.log('🚀 Navigation completed successfully')
    } catch (error) {
      console.error('❌ Error in handlePlanNext:', error)
    }
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    if (selectedPlan === 'pro') {
      router.push(`/signup?plan=${selectedPlan}&step=payment`)
      setStep('payment')
      setIsLoading(false)
      return
    }

    // For free plan, create account directly
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            subscription_type: selectedPlan
          }
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      })

      router.push('/login')
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (subscriptionId: string) => {
    console.log('PayPal subscription successful:', subscriptionId)
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            subscription_type: selectedPlan,
            paypal_subscription_id: subscriptionId
          }
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      toast({
        title: 'Account created successfully!',
        description: 'Welcome to Voice Matrix Pro! Please check your email to verify your account.',
      })

      router.push('/dashboard')
    } catch (error) {
      setError('An unexpected error occurred while creating your account')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleGoogleSignUp = async () => {
    // PROTECTION: Google signup must include plan selection
    if (!selectedPlan) {
      setError('Please select a plan first')
      return
    }
    
    setIsGoogleLoading(true)
    setError('')
    
    try {
      // Store plan selection in session storage for auth callback
      sessionStorage.setItem('voice-matrix-selected-plan', selectedPlan)
      sessionStorage.setItem('voice-matrix-signup-step', step)
      
      await signInWithGoogle()
    } catch (error: any) {
      setError(error.message || 'Failed to sign up with Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const renderStepIndicator = () => {
    const steps = [
      { id: 'plan', label: 'Choose Plan' },
      { id: 'details', label: 'Account Details' },
      ...(selectedPlan === 'pro' ? [{ id: 'payment', label: 'Payment' }] : [])
    ]

    return (
      <div className="flex items-center justify-center mb-8 space-x-4">
        {steps.map((stepItem, index) => (
          <div key={stepItem.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all duration-300 ${
              step === stepItem.id 
                ? 'vm-button-primary' 
                : steps.findIndex(s => s.id === step) > index
                  ? 'bg-green-500 text-white'
                  : 'vm-surface vm-text-muted'
            }`}>
              {steps.findIndex(s => s.id === step) > index ? '✓' : index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === stepItem.id ? 'vm-text-primary' : 'vm-text-muted'
            }`}>
              {stepItem.label}
            </span>
            {index < steps.length - 1 && (
              <div className="w-8 h-px mx-4 vm-border" />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
         style={{ background: 'var(--vm-background)' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--vm-primary)]/5 to-transparent" />
      
      <div className="relative w-full max-w-4xl">
        {/* Voice Matrix Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center vm-glow"
                style={{ background: 'var(--vm-gradient-primary)' }}
              >
                <Mic className="h-8 w-8" style={{ color: 'var(--vm-background)' }} />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--vm-accent)' }}>
                <Zap className="h-3 w-3" style={{ color: 'var(--vm-background)' }} />
              </div>
            </div>
          </div>
          <h1 className="vm-heading text-3xl font-bold tracking-wide">Voice Matrix</h1>
          <p className="vm-text-muted text-sm font-medium">AI Intelligence Platform</p>
        </div>

        {/* Step Indicator - Hidden for quick signup */}
        {!isQuickSignup && renderStepIndicator()}

        {/* Step 1: Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="vm-heading text-3xl font-bold">Choose Your Plan</h2>
              <p className="vm-text-muted text-lg">
                Start your AI voice assistant journey today
              </p>
            </div>

            <PlanSelector 
              selectedPlan={selectedPlan}
              onPlanSelect={setSelectedPlan}
              onPlanContinue={handlePlanNext}
              className="mb-8"
            />

            <div className="text-center text-sm vm-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline transition-colors" 
                    style={{ color: 'var(--vm-primary)' }}>
                Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Step 2: Account Details */}
        {step === 'details' && (
          <div className="vm-card p-8 max-w-md mx-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                {!isQuickSignup && (
                  <button
                    onClick={() => {
                      router.push('/signup?step=plan')
                      setStep('plan')
                    }}
                    className="vm-button-secondary p-2 hover:scale-105"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="text-center flex-1">
                  <h2 className="vm-heading text-2xl font-bold">
                    {isQuickSignup ? 'Get Started Free' : 'Account Details'}
                  </h2>
                  <p className="vm-text-muted">
                    {isQuickSignup 
                      ? 'Create your free Voice Matrix account in seconds'
                      : selectedPlan === 'pro' 
                        ? 'Almost there! Create your Pro account' 
                        : 'Create your free account'
                    }
                  </p>
                </div>
              </div>

              {/* Google Signup Button */}
              <button
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 hover:scale-105 font-semibold"
                style={{
                  borderColor: 'var(--vm-border)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  color: 'var(--vm-text-primary)'
                }}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--vm-border)' }}></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 vm-text-muted" style={{ background: 'var(--vm-surface)' }}>
                    Or create account with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="vm-text-primary">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading || isGoogleLoading}
                    className="vm-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="vm-text-primary">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isLoading || isGoogleLoading}
                    className="vm-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="vm-text-primary">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  className="vm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="vm-text-primary">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  className="vm-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="vm-text-primary">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  className="vm-input"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm p-3 rounded-xl" 
                     style={{ 
                       color: 'var(--vm-error)', 
                       background: 'rgba(239, 68, 68, 0.1)',
                       border: '1px solid rgba(239, 68, 68, 0.2)'
                     }}>
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
                <button 
                  type="submit" 
                  className="vm-button-primary w-full flex items-center justify-center gap-2 hover:scale-105"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {selectedPlan === 'pro' ? 'Continue to Payment...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {selectedPlan === 'pro' ? (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          Continue to Payment
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Create Free Account
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Step 3: Payment (Pro plan only) */}
        {step === 'payment' && selectedPlan === 'pro' && (
          <div className="vm-card p-8 max-w-md mx-auto">
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => {
                    router.push(`/signup?plan=${selectedPlan}&step=details`)
                    setStep('details')
                  }}
                  className="vm-button-secondary p-2 hover:scale-105"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="text-center flex-1">
                  <h2 className="vm-heading text-2xl font-bold">Payment</h2>
                  <p className="vm-text-muted">
                    Complete your Pro subscription
                  </p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="vm-surface p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="vm-text-primary font-medium">Voice Matrix Pro</span>
                  <span className="vm-text-primary font-bold">$25/month</span>
                </div>
                <div className="text-sm vm-text-muted">
                  • 10 AI assistants
                  • 100 minutes/month
                  • Priority support
                  • Advanced features
                </div>
              </div>

              {/* PayPal Payment Integration */}
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 text-sm p-3 rounded-xl" 
                       style={{ 
                         color: 'var(--vm-error)', 
                         background: 'rgba(239, 68, 68, 0.1)',
                         border: '1px solid rgba(239, 68, 68, 0.2)'
                       }}>
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                
                <PayPalCheckout
                  planId={process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID!}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  className="w-full"
                />
              </div>

              <div className="text-center text-xs vm-text-muted">
                🔒 Your payment information is secure and encrypted
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--vm-background)' }}>
        <div className="text-center">
          <div className="relative">
            <div 
              className="h-16 w-16 rounded-full flex items-center justify-center vm-glow mx-auto mb-4"
              style={{ background: 'var(--vm-gradient-primary)' }}
            >
              <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: 'var(--vm-background)', borderTopColor: 'transparent' }} />
            </div>
          </div>
          <h2 className="vm-heading text-xl font-semibold mb-2">Loading signup...</h2>
          <p className="vm-text-muted">Please wait while we prepare your signup experience.</p>
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}