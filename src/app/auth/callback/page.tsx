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
          router.push('/signin?error=' + encodeURIComponent(error.message))
          return
        }

        if (data.session?.user) {
          console.log('🚀 Auth callback - user authenticated:', data.session.user.id)
          
          // Check if user has an existing profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('setup_completed, subscription_type')
            .eq('id', data.session.user.id)
            .single()
          
          console.log('🚀 Auth callback - profile check:', { profile, profileError })
          
          // Check if this was a signup with plan selection from session storage
          const selectedPlan = sessionStorage.getItem('voice-matrix-selected-plan')
          const signupStep = sessionStorage.getItem('voice-matrix-signup-step')
          
          console.log('🚀 Auth callback - stored plan:', selectedPlan)
          console.log('🚀 Auth callback - stored step:', signupStep)
          
          if (selectedPlan && signupStep) {
            console.log('🚀 Auth callback - creating/updating user profile with plan:', selectedPlan)
            
            // Clear the stored values
            sessionStorage.removeItem('voice-matrix-selected-plan')
            sessionStorage.removeItem('voice-matrix-signup-step')
            
            // Create or update user profile with selected plan
            const profileData = {
              id: data.session.user.id,
              email: data.session.user.email!,
              full_name: data.session.user.user_metadata?.full_name || 
                        data.session.user.user_metadata?.name || 
                        data.session.user.email!.split('@')[0],
              subscription_type: selectedPlan,
              subscription_status: 'active',
              current_usage_minutes: 0,
              max_minutes_monthly: selectedPlan === 'pro' ? 100 : 10,
              max_assistants: selectedPlan === 'pro' ? 10 : 1,
              billing_cycle_start: new Date().toISOString(),
              billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              payment_method_type: 'none',
              onboarding_completed: false,
              setup_completed: true
            }
            
            const { error: upsertError } = await supabase
              .from('profiles')
              .upsert(profileData)
            
            if (upsertError) {
              console.error('❌ Failed to create/update profile:', upsertError)
            } else {
              console.log('✅ Successfully created/updated user profile with plan:', selectedPlan)
            }
            
            // New user with plan selection completed - go to dashboard
            console.log('🚀 Auth callback - new user setup complete, redirecting to dashboard')
            router.push('/dashboard')
            
          } else if (profile?.setup_completed) {
            // Existing user with completed setup - go to dashboard
            console.log('🚀 Auth callback - existing user, redirecting to dashboard')
            router.push('/dashboard')
            
          } else {
            // New user without plan selection - redirect to plan selection
            console.log('🚀 Auth callback - new user needs plan selection, redirecting to signup')
            router.push('/signup?step=plan')
          }
        } else {
          // No session found, redirect to login
          router.push('/signin')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/signin?error=authentication_failed')
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