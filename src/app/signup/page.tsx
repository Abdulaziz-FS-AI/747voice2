'use client'

import { useState } from 'react'
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

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClientSupabaseClient()
  const { signInWithGoogle } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
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

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true)
    setError('')
    
    try {
      await signInWithGoogle()
    } catch (error: any) {
      setError(error.message || 'Failed to sign up with Google')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" 
         style={{ background: 'var(--vm-background)' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--vm-primary)]/5 to-transparent" />
      
      <div className="relative w-full max-w-md">
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

        <div className="vm-card p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="vm-heading text-2xl font-bold">Join Voice Matrix</h2>
              <p className="vm-text-muted">
                Create your account and start building AI voice assistants
              </p>
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </>
                )}
              </button>
            </form>
            
            <div className="text-center text-sm vm-text-muted">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline transition-colors" 
                    style={{ color: 'var(--vm-primary)' }}>
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}