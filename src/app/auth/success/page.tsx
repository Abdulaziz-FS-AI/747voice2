'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, AlertCircle, Crown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createClientSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface PaymentSuccessData {
  email: string
  password: string
  fullName: string
  companyName: string
  planId: string
  billingCycle: 'monthly' | 'yearly'
}

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      handlePaymentSuccess()
    } else {
      setError('No payment session found. Please try again.')
      setIsLoading(false)
    }
  }, [sessionId])

  const handlePaymentSuccess = async () => {
    try {
      // Get pending signup data from localStorage
      const pendingSignupData = localStorage.getItem('pendingSignup')
      if (!pendingSignupData) {
        throw new Error('No pending signup data found. Please start the signup process again.')
      }

      const signupData: PaymentSuccessData = JSON.parse(pendingSignupData)
      
      // Verify the payment session with our API
      const verificationResponse = await fetch('/api/auth/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          planId: signupData.planId,
        }),
      })

      const verificationResult = await verificationResponse.json()

      if (!verificationResult.success) {
        throw new Error(verificationResult.error?.message || 'Payment verification failed')
      }

      // Create the user account now that payment is confirmed
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            company_name: signupData.companyName,
            plan_id: signupData.planId,
            billing_cycle: signupData.billingCycle,
            stripe_customer_id: verificationResult.data.customerId,
            stripe_subscription_id: verificationResult.data.subscriptionId,
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      // Clear the pending signup data
      localStorage.removeItem('pendingSignup')
      
      setUserEmail(signupData.email)
      setSuccess(true)
      
      toast({
        title: 'Payment successful!',
        description: 'Your account has been created. Please check your email to verify your account.',
      })

    } catch (error: any) {
      console.error('Payment success error:', error)
      setError(error.message || 'An unexpected error occurred during account creation.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    router.push('/auth/signin?message=Please check your email and click the confirmation link to complete your registration')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Processing your payment...
                </h2>
                <p className="mt-2 text-gray-600">
                  Please wait while we set up your account.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-blue-600 mb-2">Voice Matrix</h1>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">
              Payment Processing Error
            </h2>
          </div>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  Something went wrong
                </h2>
                
                <Alert variant="destructive" className="mt-4 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="mt-6 space-y-3">
                  <Button 
                    onClick={() => router.push('/pricing')} 
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/auth/signin')}
                    className="w-full"
                  >
                    Sign In Instead
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-3xl font-bold text-blue-600 mb-2">Voice Matrix</h1>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome to Voice Matrix!
            </h2>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-900">Payment Successful!</CardTitle>
              <CardDescription>
                Your account has been created and your subscription is active
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p><strong>✅ Payment processed successfully</strong></p>
                    <p><strong>✅ Account created for:</strong> {userEmail}</p>
                    <p><strong>✅ 14-day free trial activated</strong></p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
                <ol className="text-blue-800 text-sm space-y-1">
                  <li>1. Check your email for a verification link</li>
                  <li>2. Click the link to verify your email address</li>
                  <li>3. Sign in to start creating your AI assistants</li>
                </ol>
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Support */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <Link href="/support" className="text-blue-600 hover:text-blue-500 font-medium">
                Contact our support team
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}