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
  pin: string | null // Store PIN locally for API requests
  isAuthenticated: boolean
  isLoading: boolean
  login: (pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  reloadFromStorage: () => void
}

const PinAuthContext = createContext<PinAuthContextType | undefined>(undefined)

interface PinAuthProviderProps {
  children: ReactNode
}

export function PinAuthProvider({ children }: PinAuthProviderProps) {
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Computed authentication state - SIMPLIFIED: just check if we have client and PIN
  const isAuthenticated = !!(client && pin)
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute = (path: string) => {
    const publicRoutes = ['/signin', '/signup', '/demo-login', '/debug-auth.html']
    return publicRoutes.includes(path) || path.startsWith('/api/')
  }

  // Load from localStorage on mount - SIMPLIFIED (no session tokens)
  useEffect(() => {
    const loadSession = () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }
        
        // Get stored client info and PIN
        const storedClient = localStorage.getItem('client-info')
        const storedPin = localStorage.getItem('client-pin')

        if (storedClient && storedPin) {
          try {
            const clientInfo = JSON.parse(storedClient)
            
            // Validate PIN format
            if (/^[0-9]{6}$/.test(storedPin)) {
              setClient(clientInfo)
              setPin(storedPin)
            } else {
              // Invalid PIN format, clear storage
              clearLocalStorage()
            }
          } catch (error) {
            console.error('[PIN Auth] Error parsing stored data:', error)
            clearLocalStorage()
          }
        }
      } catch (error) {
        console.error('[PIN Auth] Error loading from storage:', error)
        clearLocalStorage()
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

  const clearLocalStorage = () => {
    localStorage.removeItem('client-info')
    localStorage.removeItem('client-pin')
    setClient(null)
    setPin(null)
  }

  const login = async (pinInput: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinInput }),
      })

      const result = await response.json()

      if (result.success) {
        const { client_id, company_name } = result.data
        
        const clientInfo: ClientInfo = {
          id: client_id,
          company_name: company_name,
          contact_email: '' // Will be loaded from API if needed
        }
        
        // Store client info and PIN locally - SIMPLIFIED APPROACH
        localStorage.setItem('client-info', JSON.stringify(clientInfo))
        localStorage.setItem('client-pin', pinInput)

        setClient(clientInfo)
        setPin(pinInput)

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
    // Call logout API (optional, since there are no sessions to invalidate)
    fetch('/api/auth/pin-login', {
      method: 'DELETE',
    }).catch(error => {
      console.error('[PIN Auth] Logout API error:', error)
    })

    // Clear local storage
    clearLocalStorage()
    router.push('/signin')
  }

  const reloadFromStorage = (): void => {
    try {
      if (typeof window === 'undefined') return

      const storedClient = localStorage.getItem('client-info')
      const storedPin = localStorage.getItem('client-pin')

      if (storedClient && storedPin) {
        try {
          const clientInfo = JSON.parse(storedClient)
          
          // Validate PIN format
          if (/^[0-9]{6}$/.test(storedPin)) {
            setClient(clientInfo)
            setPin(storedPin)
          } else {
            clearLocalStorage()
          }
        } catch (error) {
          console.error('[PIN Auth] Error parsing stored data:', error)
          clearLocalStorage()
        }
      }
    } catch (error) {
      console.error('[PIN Auth] Error reloading from storage:', error)
      clearLocalStorage()
    }
  }

  const value: PinAuthContextType = {
    client,
    pin,
    isAuthenticated: !!(pin && client),
    isLoading,
    login,
    logout,
    reloadFromStorage,
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