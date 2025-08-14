'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface ClientInfo {
  id: string
  company_name: string
  contact_email: string
}

export interface PinAuthContextType {
  client: ClientInfo | null
  sessionToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshSession: () => Promise<boolean>
}

const PinAuthContext = createContext<PinAuthContextType | undefined>(undefined)

interface PinAuthProviderProps {
  children: ReactNode
}

export function PinAuthProvider({ children }: PinAuthProviderProps) {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Computed authentication state
  const isAuthenticated = !!(client && sessionToken)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute = (path: string) => {
    const publicRoutes = ['/signin', '/signup', '/demo-login', '/debug-auth.html']
    return publicRoutes.includes(path) || path.startsWith('/api/')
  }

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = localStorage.getItem('session-token')
        const storedClient = localStorage.getItem('client-info')

        if (storedToken && storedClient) {
          const clientInfo = JSON.parse(storedClient)
          
          // Validate session with server
          const isValid = await validateSession(storedToken)
          if (isValid) {
            setSessionToken(storedToken)
            setClient(clientInfo)
          } else {
            // Session expired, clear local storage
            clearLocalSession()
          }
        }
      } catch (error) {
        console.error('[PIN Auth] Error loading session:', error)
        clearLocalSession()
      } finally {
        setIsLoading(false)
      }
    }

    loadSession()
  }, [])

  // Redirect logic
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute(pathname)) {
        router.push('/signin')
      } else if (isAuthenticated && pathname === '/signin') {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, pathname, router])

  const validateSession = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate-session', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      return response.ok
    } catch (error) {
      console.error('[PIN Auth] Session validation error:', error)
      return false
    }
  }

  const clearLocalSession = () => {
    localStorage.removeItem('session-token')
    localStorage.removeItem('client-info')
    setSessionToken(null)
    setClient(null)
  }

  const login = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const result = await response.json()

      if (result.success) {
        const { session_token, client_id, company_name } = result.data
        
        // Store session info
        localStorage.setItem('session-token', session_token)
        localStorage.setItem('client-info', JSON.stringify({
          id: client_id,
          company_name: company_name,
          contact_email: '' // Will be loaded from API if needed
        }))

        setSessionToken(session_token)
        setClient({
          id: client_id,
          company_name: company_name,
          contact_email: ''
        })

        return { success: true }
      } else {
        return { 
          success: false, 
          error: result.error?.message || 'Invalid PIN' 
        }
      }
    } catch (error) {
      console.error('[PIN Auth] Login error:', error)
      return { 
        success: false, 
        error: 'Login failed. Please try again.' 
      }
    }
  }

  const logout = () => {
    // Invalidate session on server (optional)
    if (sessionToken) {
      fetch('/api/auth/pin-login', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      }).catch(error => {
        console.error('[PIN Auth] Logout API error:', error)
      })
    }

    // Clear local session
    clearLocalSession()
    router.push('/signin')
  }

  const refreshSession = async (): Promise<boolean> => {
    if (!sessionToken) return false

    try {
      const isValid = await validateSession(sessionToken)
      if (!isValid) {
        logout()
        return false
      }
      return true
    } catch (error) {
      console.error('[PIN Auth] Session refresh error:', error)
      logout()
      return false
    }
  }

  const value: PinAuthContextType = {
    client,
    sessionToken,
    isAuthenticated: !!(sessionToken && client),
    isLoading,
    login,
    logout,
    refreshSession,
  }

  return (
    <PinAuthContext.Provider value={value}>
      {children}
    </PinAuthContext.Provider>
  )
}

export function usePinAuth() {
  const context = useContext(PinAuthContext)
  if (context === undefined) {
    throw new Error('usePinAuth must be used within a PinAuthProvider')
  }
  return context
}