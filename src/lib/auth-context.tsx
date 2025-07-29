'use client'

// Simple mock auth context for non-authenticated mode
export function useAuth() {
  return {
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'user@example.com' },
    loading: false,
    signOut: () => Promise.resolve()
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}