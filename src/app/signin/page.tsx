'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Mic, Zap, Lock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'

function PinLoginContent() {
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, login } = usePinAuth()

  useEffect(() => {
    // Check for error messages in URL params
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!pin || pin.length !== 6) {
        setError('Please enter a valid 6 digit PIN')
        return
      }

      // Use the simplified PinAuthProvider's login method
      const loginResult = await login(pin)

      if (!loginResult.success) {
        setError(loginResult.error || 'Invalid PIN')
        return
      }

      toast({
        title: 'Welcome!',
        description: `Successfully logged in!`,
      })

      // The PinAuthProvider will handle the redirect automatically via useEffect
      
    } catch (error: any) {
      console.error('[PIN Login] Error:', error)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 auth-container" 
         style={{ background: 'var(--vm-color-background)' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--vm-color-primary)]/5 to-transparent" />
      
      <div className="relative w-full max-w-md">
        {/* Voice Matrix Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center vm-hover-glow"
                style={{ background: 'var(--vm-gradient-primary)' }}
              >
                <Mic className="h-8 w-8" style={{ color: 'var(--vm-color-background)' }} />
              </div>
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center"
                   style={{ background: 'var(--vm-color-accent)' }}>
                <Lock className="h-3 w-3" style={{ color: 'var(--vm-color-background)' }} />
              </div>
            </div>
          </div>
          <h1 className="vm-text-page-title vm-text-gradient-primary tracking-wide">Voice Matrix</h1>
          <p className="vm-text-body text-[var(--vm-color-muted)] font-medium">Client Access Portal</p>
        </div>

        <div className="vm-card p-8 auth-card">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="vm-text-section vm-text-primary font-bold">Client Login</h2>
              <p className="vm-text-body text-[var(--vm-color-muted)]">
                Enter your secure PIN to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pin" className="vm-text-body text-[var(--vm-color-foreground)] text-center block">
                  Security PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter your 6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  disabled={isLoading}
                  className="text-center text-lg tracking-widest"
                  style={{ fontSize: '1.125rem', letterSpacing: '0.5em' }}
                />
                <p className="vm-text-caption text-[var(--vm-color-muted)] text-center">
                  Your PIN was provided by your administrator
                </p>
              </div>

              {/* PIN stays in local storage until manual logout */}
              <div className="text-center">
                <p className="vm-text-caption text-[var(--vm-color-muted)]">
                  Your login will persist until you manually log out
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 vm-text-small p-3 rounded-[var(--vm-radius-lg)]" 
                     style={{ 
                       color: 'var(--vm-color-destructive)', 
                       background: 'rgba(239, 68, 68, 0.1)',
                       border: '1px solid rgba(239, 68, 68, 0.2)'
                     }}>
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="vm-button-primary w-full flex items-center justify-center gap-2 vm-hover-lift"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Access Dashboard
                  </>
                )}
              </button>
            </form>
            
            {/* Help Section */}
            <div className="pt-4 border-t text-center" style={{ borderColor: 'var(--vm-color-border)' }}>
              <p className="vm-text-small text-[var(--vm-color-muted)] mb-2">
                Need help accessing your account?
              </p>
              <p className="vm-text-caption text-[var(--vm-color-muted)]">
                Contact your administrator for PIN assistance or reset requests.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PinLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--vm-color-background)' }}>
        <div className="text-center">
          <div className="relative">
            <div 
              className="h-16 w-16 rounded-full flex items-center justify-center vm-hover-glow mx-auto mb-4"
              style={{ background: 'var(--vm-gradient-primary)' }}
            >
              <div className="h-6 w-6 border-2 border-t-transparent rounded-full animate-spin"
                   style={{ borderColor: 'var(--vm-color-background)', borderTopColor: 'transparent' }} />
            </div>
          </div>
          <h2 className="vm-text-subsection font-semibold mb-2">Loading...</h2>
          <p className="vm-text-body text-[var(--vm-color-muted)]">Preparing client login...</p>
        </div>
      </div>
    }>
      <PinLoginContent />
    </Suspense>
  )
}