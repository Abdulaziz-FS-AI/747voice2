'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Mic, Zap, Mail, UserPlus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

function SignUpContent() {
  const router = useRouter()
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

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('🚀 User already authenticated, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      setError('')
      
      await signInWithGoogle()
      
      toast({
        title: 'Success!',
        description: 'Account created successfully. Welcome to Voice Matrix!',
      })
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setError(error.message || 'Google sign-in failed')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Basic validation
      if (!email || !password || !firstName) {
        throw new Error('Please fill in all required fields')
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      console.log('🚀 Creating account with email:', email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName
          }
        }
      })

      if (error) {
        throw error
      }

      if (data?.user && !data?.user?.email_confirmed_at) {
        toast({
          title: 'Check your email',
          description: 'We sent you a confirmation link. Please check your email to complete signup.',
        })
        return
      }

      toast({
        title: 'Welcome to Voice Matrix!',
        description: 'Your account has been created successfully.',
      })

      router.push('/dashboard')
    } catch (error: any) {
      console.error('Signup error:', error)
      setError(error.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vm-primary-dark)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--vm-secondary-purple)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--vm-primary-dark)' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0" 
             style={{ 
               background: 'var(--vm-gradient-primary)',
               opacity: 0.9
             }} />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div 
                  className="h-16 w-16 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center bg-white">
                  <Zap className="h-3 w-3" style={{ color: 'var(--vm-secondary-purple)' }} />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Voice Matrix</h1>
                <p className="text-white/80 text-lg">AI Intelligence Platform</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white">
                Start building with Voice Matrix
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-white/90">3 AI assistants included</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-white/90">10 minutes of calls per month</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-white/90">Advanced voice AI technology</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-white/90">Easy setup and management</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--vm-gradient-primary)' }}
                >
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
                     style={{ background: 'var(--vm-accent-blue)' }}>
                  <Zap className="h-2 w-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--vm-primary-light)' }}>Voice Matrix</h1>
              </div>
            </div>
          </div>

          <Card style={{ 
            backgroundColor: 'var(--vm-primary-surface)',
            borderColor: 'var(--vm-border-default)'
          }}>
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl" style={{ color: 'var(--vm-text-primary)' }}>
                Create Your Account
              </CardTitle>
              <CardDescription style={{ color: 'var(--vm-text-muted)' }}>
                Start building with Voice Matrix today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg border" style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'var(--vm-error-red)'
                }}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" style={{ color: 'var(--vm-error-red)' }} />
                    <span className="text-sm" style={{ color: 'var(--vm-error-red)' }}>
                      {error}
                    </span>
                  </div>
                </div>
              )}

              {/* Google Sign Up */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: 'var(--vm-border-subtle)' }} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2" style={{ 
                    backgroundColor: 'var(--vm-primary-surface)', 
                    color: 'var(--vm-text-muted)' 
                  }}>
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Sign Up Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" style={{ color: 'var(--vm-text-primary)' }}>
                      First Name *
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" style={{ color: 'var(--vm-text-primary)' }}>
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" style={{ color: 'var(--vm-text-primary)' }}>
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" style={{ color: 'var(--vm-text-primary)' }}>
                    Password *
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" style={{ color: 'var(--vm-text-primary)' }}>
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                  style={{ background: 'var(--vm-gradient-primary)' }}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Create Account
                </Button>
              </form>

              <div className="text-center">
                <span className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                  Already have an account?{' '}
                  <Link 
                    href="/signin" 
                    className="font-medium hover:underline"
                    style={{ color: 'var(--vm-secondary-purple)' }}
                  >
                    Sign in
                  </Link>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--vm-primary-dark)' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--vm-secondary-purple)' }} />
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}