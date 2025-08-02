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
          // Check if this was a signup with plan selection
          const selectedPlan = sessionStorage.getItem('voice-matrix-selected-plan')
          const signupStep = sessionStorage.getItem('voice-matrix-signup-step')
          
          if (selectedPlan && signupStep) {
            // Clear the stored values
            sessionStorage.removeItem('voice-matrix-selected-plan')
            sessionStorage.removeItem('voice-matrix-signup-step')
            
            // Update user profile with selected plan
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                subscription_type: selectedPlan,
                max_minutes_monthly: selectedPlan === 'pro' ? 100 : 10,
                max_assistants: selectedPlan === 'pro' ? 10 : 1
              })
              .eq('id', data.session.user.id)
            
            if (updateError) {
              console.error('Failed to update plan:', updateError)
            }
          }
          
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