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
          
          // Check if this was a signup with plan selection
          const selectedPlan = sessionStorage.getItem('voice-matrix-selected-plan')
          const signupStep = sessionStorage.getItem('voice-matrix-signup-step')
          
          console.log('🚀 Auth callback - stored plan:', selectedPlan)
          
          if (selectedPlan && signupStep) {
            // Clear the stored values
            sessionStorage.removeItem('voice-matrix-selected-plan')
            sessionStorage.removeItem('voice-matrix-signup-step')
            
            console.log('🚀 Auth callback - new user with plan selection:', selectedPlan)
            
            // Ensure profile exists first
            console.log('🚀 Auth callback - ensuring profile exists for user:', data.session.user.id)
            
            try {
              const { data: ensureResult, error: ensureError } = await supabase
                .rpc('ensure_profile_exists', { user_id: data.session.user.id })
              
              if (ensureError) {
                console.error('🚀 Auth callback - ensure profile error:', ensureError)
                // Try to create profile manually if function fails
                await supabase
                  .from('profiles')
                  .insert({
                    id: data.session.user.id,
                    email: data.session.user.email || 'unknown@example.com',
                    full_name: data.session.user.user_metadata?.full_name || 
                              data.session.user.user_metadata?.name || 
                              data.session.user.email?.split('@')[0] || 'User',
                    max_assistants: 3,
                    max_minutes_total: 10,
                    current_usage_minutes: 0
                  })
                  .select()
                  .single()
              } else {
                console.log('🚀 Auth callback - ensure profile result:', ensureResult)
              }
            } catch (ensureError) {
              console.error('🚀 Auth callback - ensure profile error:', ensureError)
            }
            
            // Wait a moment for profile to be created
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Demo system: Profile already created with correct limits
            console.log('🚀 Auth callback - demo profile ready')
            
            // Demo system: All users go to same dashboard
            router.push('/dashboard?new=demo')
          } else {
            // Existing user or no plan selection - ensure profile exists
            console.log('🚀 Auth callback - checking existing user profile')
            
            // First ensure profile exists
            try {
              const { data: ensureResult, error: ensureError } = await supabase
                .rpc('ensure_profile_exists', { user_id: data.session.user.id })
              
              if (ensureError) {
                console.error('🚀 Auth callback - ensure profile error:', ensureError)
                // Try to create profile manually if function fails
                await supabase
                  .from('profiles')
                  .insert({
                    id: data.session.user.id,
                    email: data.session.user.email || 'unknown@example.com',
                    full_name: data.session.user.user_metadata?.full_name || 
                              data.session.user.user_metadata?.name || 
                              data.session.user.email?.split('@')[0] || 'User',
                    max_assistants: 3,
                    max_minutes_total: 10,
                    current_usage_minutes: 0
                  })
                  .select()
                  .single()
              } else {
                console.log('🚀 Auth callback - ensure profile result:', ensureResult)
              }
            } catch (ensureError) {
              console.error('🚀 Auth callback - ensure profile error:', ensureError)
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
            
            if (profile) {
              console.log('🚀 Auth callback - existing user, redirecting to dashboard')
              router.push('/dashboard')
            } else {
              console.log('🚀 Auth callback - new user, redirecting to dashboard')
              router.push('/dashboard?new=demo')
            }
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
            style={{ 
              background: 'var(--vm-gradient-primary)',
              animation: 'spin 1s linear infinite'
            }}
          >
            <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--vm-text-primary)' }}>
          Completing authentication...
        </h2>
        <p style={{ color: 'var(--vm-text-muted)' }}>
          Please wait while we set up your account
        </p>
      </div>
    </div>
  )
}