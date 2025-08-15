import type { ClientInfo } from '@/lib/contexts/pin-auth-context'

export interface SessionData {
  pin: string | null
  clientInfo: ClientInfo | null
}

/**
 * Get PIN from localStorage - SIMPLIFIED APPROACH
 */
export function getClientPin(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem('client-pin')
  } catch (error) {
    console.error('[Session] Error getting client PIN:', error)
    return null
  }
}

/**
 * Set PIN in localStorage
 */
export function setClientPin(pin: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('client-pin', pin)
  } catch (error) {
    console.error('[Session] Error setting client PIN:', error)
  }
}

/**
 * Get client info from localStorage
 */
export function getClientInfo(): ClientInfo | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('client-info')
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error('[Session] Error getting client info:', error)
    return null
  }
}

/**
 * Set client info in localStorage
 */
export function setClientInfo(clientInfo: ClientInfo): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('client-info', JSON.stringify(clientInfo))
  } catch (error) {
    console.error('[Session] Error setting client info:', error)
  }
}

/**
 * Clear all session data - SIMPLIFIED (no session tokens)
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('client-pin')
    localStorage.removeItem('client-info')
  } catch (error) {
    console.error('[Session] Error clearing session:', error)
  }
}

/**
 * Check if user is authenticated - SIMPLIFIED (has PIN and client info)
 */
export function isAuthenticated(): boolean {
  const pin = getClientPin()
  const client = getClientInfo()
  return !!(pin && client && /^[0-9]{6}$/.test(pin))
}

/**
 * Get complete session data - SIMPLIFIED
 */
export function getSessionData(): SessionData {
  return {
    pin: getClientPin(),
    clientInfo: getClientInfo()
  }
}

/**
 * Create headers with PIN authentication for API requests
 * SIMPLIFIED: Uses Bearer {PIN} for authentication
 */
export function createAuthHeaders(): HeadersInit {
  const pin = getClientPin()
  
  return {
    'Content-Type': 'application/json',
    ...(pin && { 'Authorization': `Bearer ${pin}` })
  }
}

/**
 * Make authenticated API request - SIMPLIFIED with PIN
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const headers = createAuthHeaders()
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  })
}

/**
 * Handle API response and check for authentication errors
 * SIMPLIFIED: Clear local storage on auth error
 */
export async function handleAuthenticatedResponse<T>(
  response: Response,
  onUnauthorized?: () => void
): Promise<T> {
  if (response.status === 401) {
    // PIN authentication failed or invalid
    clearSession()
    if (onUnauthorized) {
      onUnauthorized()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/signin'
    }
    throw new Error('PIN authentication failed')
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}