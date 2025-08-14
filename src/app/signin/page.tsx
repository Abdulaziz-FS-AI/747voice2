'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Mic, Zap, Lock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

function PinLoginContent() {
  const [pin, setPin] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for error messages in URL params
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (!pin || pin.length !== 6) {
        setError('Please enter a valid 6 digit PIN')
        return
      }

      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin, rememberMe }),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || 'Invalid PIN')
        return
      }

      // Store session info in localStorage for the frontend
      localStorage.setItem('session-token', result.data.session_token)
      localStorage.setItem('client-info', JSON.stringify({
        client_id: result.data.client_id,
        company_name: result.data.company_name
      }))
      
      // Store remember me preference if checked
      if (rememberMe) {
        localStorage.setItem('remember-me', 'true')
        localStorage.setItem('remember-token', result.data.session_token)
      } else {
        localStorage.removeItem('remember-me')
        localStorage.removeItem('remember-token')
      }

      toast({
        title: 'Welcome!',
        description: result.message,
      })

      router.push('/dashboard')
    } catch (error: any) {
      console.error('[PIN Login] Error:', error)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
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
                <Lock className="h-3 w-3" style={{ color: 'var(--vm-background)' }} />
              </div>
            </div>
          </div>
          <h1 className="vm-heading text-3xl font-bold tracking-wide">Voice Matrix</h1>
          <p className="vm-text-muted text-sm font-medium">Client Access Portal</p>
        </div>

        <div className="vm-card p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="vm-heading text-2xl font-bold">Client Login</h2>
              <p className="vm-text-muted">
                Enter your secure PIN to access your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pin" className="vm-text-primary text-center block">
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
                  className="vm-input text-center text-lg tracking-widest"
                  style={{ fontSize: '1.125rem', letterSpacing: '0.5em' }}
                />
                <p className="text-xs vm-text-muted text-center">
                  Your PIN was provided by your administrator
                </p>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <Label htmlFor="remember-me" className="text-sm vm-text-muted cursor-pointer">
                  Remember me on this device
                </Label>
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
            <div className="pt-4 border-t text-center" style={{ borderColor: 'var(--vm-border)' }}>
              <p className="text-sm vm-text-muted mb-2">
                Need help accessing your account?
              </p>
              <p className="text-xs vm-text-muted">
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
          <h2 className="vm-heading text-xl font-semibold mb-2">Loading...</h2>
          <p className="vm-text-muted">Preparing client login...</p>
        </div>
      </div>
    }>
      <PinLoginContent />
    </Suspense>
  )
}