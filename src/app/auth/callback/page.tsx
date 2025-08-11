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
        console.log('🔄 [DEMO AUTH] Starting authentication callback...')
        
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ [DEMO AUTH] Auth callback error:', error)
          router.push('/signin?error=' + encodeURIComponent(error.message))
          return
        }

        if (data.session?.user) {
          console.log('✅ [DEMO AUTH] User authenticated:', data.session.user.id)
          
          // Demo system: Simply ensure profile exists and redirect
          // The profile will be created by the database trigger, but let's ensure it exists
          try {
            console.log('🔄 [DEMO AUTH] Checking if profile exists...')
            
            // Check if profile already exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single()
            
            if (!existingProfile) {
              console.log('➕ [DEMO AUTH] Creating demo profile...')
              
              // Create profile with demo limits
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: data.session.user.id,
                  email: data.session.user.email || 'unknown@example.com',
                  full_name: data.session.user.user_metadata?.full_name || 
                            data.session.user.user_metadata?.name || 
                            data.session.user.email?.split('@')[0] || 'Demo User',
                  max_assistants: 3,
                  max_minutes_total: 10,
                  current_usage_minutes: 0
                })
              
              if (createError) {
                console.error('❌ [DEMO AUTH] Profile creation error:', createError)
                // Continue anyway - the trigger might have created it
              } else {
                console.log('✅ [DEMO AUTH] Profile created successfully')
              }
            } else {
              console.log('✅ [DEMO AUTH] Profile already exists')
            }
            
            // Small delay to ensure everything is ready
            await new Promise(resolve => setTimeout(resolve, 500))
            
            console.log('🎯 [DEMO AUTH] Redirecting to dashboard...')
            router.push('/dashboard')
            
          } catch (profileError) {
            console.error('❌ [DEMO AUTH] Profile handling error:', profileError)
            // Still redirect to dashboard - it will handle missing profiles
            router.push('/dashboard')
          }
        } else {
          console.log('❌ [DEMO AUTH] No session found, redirecting to signin')
          router.push('/signin')
        }
      } catch (error) {
        console.error('❌ [DEMO AUTH] Auth callback error:', error)
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