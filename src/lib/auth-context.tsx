'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Handle successful sign in - let auth callback handle routing
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🚀 Auth context - SIGNED_IN event, current path:', window.location.pathname)
        
        // Only redirect from signin page after checking profile status
        if (window.location.pathname === '/signin') {
          // Check if user has completed profile
          supabase
            .from('profiles')
            .select('setup_completed')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile, error }) => {
              if (error && error.code === 'PGRST116') {
                // No profile - new user needs plan selection
                console.log('🚀 Auth context - new user, redirecting to signup')
                window.location.href = '/signup?step=plan'
              } else if (profile?.setup_completed) {
                // Existing user with complete profile
                console.log('🚀 Auth context - existing user, redirecting to dashboard')
                window.location.href = '/dashboard'
              } else {
                // User exists but setup not complete
                console.log('🚀 Auth context - user setup incomplete, redirecting to signup')
                window.location.href = '/signup?step=plan'
              }
            })
        }
        // For auth/callback and signup pages, let them handle their own navigation
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      throw error
    }
  }

  const value = {
    user,
    loading,
    signOut,
    signInWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}