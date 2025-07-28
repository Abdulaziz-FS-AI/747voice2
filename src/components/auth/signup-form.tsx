'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, AlertCircle, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createClientSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface PricingPlan {
  id: string
  name: string
  display_name: string
  price_monthly: number
  price_yearly: number
  max_assistants: number
  max_phone_numbers: number
  features: string[]
}

export default function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const planId = searchParams.get('plan')
  const cycle = searchParams.get('cycle') as 'monthly' | 'yearly'
  const isAdminEmail = email === 'abdulaziz.fs.ai@gmail.com'

  useEffect(() => {
    if (cycle) {
      setBillingCycle(cycle)
    }
  }, [cycle])

  useEffect(() => {
    if (planId) {
      fetchPlanDetails()
    }
  }, [planId])

  useEffect(() => {
    // Clear error when user starts typing
    if (error && (email || password || confirmPassword || fullName)) {
      setError(null)
    }
  }, [email, password, confirmPassword, fullName, error])

  const fetchPlanDetails = async () => {
    try {
      const { data: plan, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single()

      if (error || !plan) {
        setError('Selected plan not found. Please select a plan from our pricing page.')
        return
      }

      setSelectedPlan(plan)
    } catch (error) {
      console.error('Error fetching plan:', error)
      setError('Failed to load plan details. Please try again.')
    }
  }

  const validateForm = () => {
    if (!email) {
      setError('Email is required')
      return false
    }
    if (!password) {
      setError('Password is required')
      return false
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return false
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!fullName.trim()) {
      setError('Full name is required')
      return false
    }
    if (!isAdminEmail && !selectedPlan) {
      setError('Please select a plan from our pricing page')
      return false
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      // For admin email, create account directly and bypass payment
      if (isAdminEmail) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
              is_admin: true,
            }
          }
        })

        if (error) throw error

        toast({
          title: 'Admin account created!',
          description: 'Please check your email to verify your account.',
        })

        router.push('/auth/signin?message=Please check your email and click the confirmation link')
        return
      }

      // For regular users, start payment flow
      if (!selectedPlan) {
        setError('Please select a plan from our pricing page')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/auth/signup-with-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          email,
          fullName,
          companyName,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to start signup process')
      }

      if (result.data.requiresPayment) {
        // Store user data in localStorage for after payment
        localStorage.setItem('pendingSignup', JSON.stringify({
          email,
          password,
          fullName,
          companyName,
          planId: selectedPlan.id,
          billingCycle,
        }))

        // Redirect to Stripe Checkout
        window.location.href = result.data.checkoutUrl
      } else {
        // Free plan - create account directly
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              company_name: companyName,
              plan_id: selectedPlan.id,
            }
          }
        })

        if (error) throw error

        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        })

        router.push('/auth/signin?message=Please check your email and click the confirmation link')
      }

    } catch (error: any) {
      console.error('Sign-up error:', error)
      
      if (error.message?.includes('User already registered')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else if (error.message?.includes('Password should be at least 6 characters')) {
        setError('Password must be at least 6 characters long.')
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: selectedPlan ? {
            plan_id: selectedPlan.id,
            billing_cycle: billingCycle,
          } : undefined,
        },
      })

      if (error) {
        setError(error.message)
      }
      // Note: Redirect will be handled by OAuth flow
    } catch (err: any) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentPrice = () => {
    if (!selectedPlan) return 0
    return billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly
  }

  const getYearlySavings = () => {
    if (!selectedPlan || selectedPlan.price_yearly === 0) return 0
    const yearlyTotal = selectedPlan.price_monthly * 12
    return Math.round(((yearlyTotal - selectedPlan.price_yearly) / yearlyTotal) * 100)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">Voice Matrix</h1>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-gray-600">
            {isAdminEmail ? 'Setting up admin account' : 'Get started with your AI voice assistant'}
          </p>
        </div>

        {/* Plan Summary Card */}
        {selectedPlan && !isAdminEmail && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-900">{selectedPlan.display_name}</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    ${getCurrentPrice()}
                    <span className="text-sm font-normal">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  {billingCycle === 'yearly' && getYearlySavings() > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      Save {getYearlySavings()}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-sm text-blue-700">
                • {selectedPlan.max_assistants} AI assistant{selectedPlan.max_assistants > 1 ? 's' : ''}
                • {selectedPlan.max_phone_numbers} phone number{selectedPlan.max_phone_numbers > 1 ? 's' : ''}
                • 14-day free trial
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              {isAdminEmail ? 'Administrator account registration' : 'Create your account to get started'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Google Sign Up Button - Only show for non-admin users */}
            {!isAdminEmail && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  className="w-full mb-4"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? 'Signing up...' : 'Continue with Google'}
                </Button>
                
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                  </div>
                </div>
              </>
            )}
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Admin Badge */}
              {isAdminEmail && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="flex items-center justify-between">
                      <span>Administrator Account Setup</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Admin Access
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={isAdminEmail ? 'border-yellow-300 focus:border-yellow-500' : ''}
                />
              </div>

              {/* Company Name Field (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name (optional)</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={isAdminEmail ? 'border-yellow-300 focus:border-yellow-500' : ''}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={isAdminEmail ? 'border-yellow-300 focus:border-yellow-500' : ''}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={isAdminEmail ? 'border-yellow-300 focus:border-yellow-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={isAdminEmail ? 'border-yellow-300 focus:border-yellow-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                className={`w-full ${
                  isAdminEmail 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isAdminEmail ? 'Creating admin account...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {isAdminEmail ? 'Create Admin Account' : 'Start Free Trial'}
                    {isAdminEmail && <Crown className="ml-2 h-4 w-4" />}
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500 font-medium">
                Sign in
              </Link>
            </div>

            {/* Admin Instructions */}
            {isAdminEmail && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Admin Access:</strong> This account will have full system administrator privileges and bypass all payment requirements.
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>

        {/* Back to Pricing */}
        <div className="text-center">
          <Link 
            href="/pricing" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to pricing
          </Link>
        </div>
      </div>
    </div>
  )
}