'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=' + encodeURIComponent(error.message))
          return
        }

        if (data.session?.user) {
          // Successfully authenticated, redirect to dashboard
          router.push('/dashboard')
        } else {
          // No session found, redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=authentication_failed')
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth])

  return (
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
        <h2 className="vm-heading text-xl font-semibold mb-2">Signing you in...</h2>
        <p className="vm-text-muted">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}