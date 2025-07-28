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

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientSupabaseClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const redirectedFrom = searchParams.get('redirectedFrom')
  const isAdminEmail = email === 'abdulaziz.fs.ai@gmail.com'

  useEffect(() => {
    // Clear error when user starts typing
    if (error && (email || password)) {
      setError(null)
    }
  }, [email, password, error])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Success - let middleware handle redirect
      toast({
        title: 'Welcome back!',
        description: isAdminEmail ? 'Signed in as system administrator' : 'Successfully signed in',
      })

      // Redirect based on user status
      if (redirectedFrom) {
        router.push(redirectedFrom)
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Sign-in error:', error)
      
      // Handle specific error cases
      if (error.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials and try again.')
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Please check your email and click the confirmation link before signing in.')
      } else if (error.message?.includes('Too many requests')) {
        setError('Too many sign-in attempts. Please wait a moment and try again.')
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast({
        title: 'Password reset email sent',
        description: 'Check your email for a link to reset your password.',
      })
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email. Please try again.')
    }
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
            Welcome back
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your email and password to access your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
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
                      <span>Administrator Account Detected</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Admin Access
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-500"
                    disabled={isLoading}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
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

              {/* Sign In Button */}
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    {isAdminEmail && <Crown className="ml-2 h-4 w-4" />}
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/pricing" className="text-blue-600 hover:text-blue-500 font-medium">
                Get started with a plan
              </Link>
            </div>

            {/* Admin Instructions */}
            {isAdminEmail && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Admin Access:</strong> This account has system administrator privileges and bypasses all payment requirements.
                </AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}