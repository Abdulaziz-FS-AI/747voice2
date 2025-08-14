import type { ClientInfo } from '@/lib/contexts/pin-auth-context'

export interface SessionData {
  sessionToken: string | null
  clientInfo: ClientInfo | null
}

/**
 * Get session token from localStorage
 */
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    return localStorage.getItem('session-token')
  } catch (error) {
    console.error('[Session] Error getting session token:', error)
    return null
  }
}

/**
 * Set session token in localStorage
 */
export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('session-token', token)
  } catch (error) {
    console.error('[Session] Error setting session token:', error)
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
 * Clear all session data
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('session-token')
    localStorage.removeItem('client-info')
  } catch (error) {
    console.error('[Session] Error clearing session:', error)
  }
}

/**
 * Check if user is authenticated (has valid session data)
 */
export function isAuthenticated(): boolean {
  const token = getSessionToken()
  const client = getClientInfo()
  return !!(token && client)
}

/**
 * Get complete session data
 */
export function getSessionData(): SessionData {
  return {
    sessionToken: getSessionToken(),
    clientInfo: getClientInfo()
  }
}

/**
 * Create headers with authentication for API requests
 */
export function createAuthHeaders(): HeadersInit {
  const token = getSessionToken()
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  }
}

/**
 * Make authenticated API request
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
 */
export async function handleAuthenticatedResponse<T>(
  response: Response,
  onUnauthorized?: () => void
): Promise<T> {
  if (response.status === 401) {
    // Session expired or invalid
    clearSession()
    if (onUnauthorized) {
      onUnauthorized()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/signin'
    }
    throw new Error('Session expired')
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}