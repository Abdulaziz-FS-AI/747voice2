'use client'

// Simple mock auth context for non-authenticated mode
export function useAuth() {
  return {
    user: { id: 'mock-user-id', email: 'user@example.com' },
    loading: false,
    signOut: () => Promise.resolve()
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}