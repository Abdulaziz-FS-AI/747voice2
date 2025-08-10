'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function DemoLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Set demo mode cookie
    document.cookie = 'demo-mode=true; path=/; max-age=86400'; // 24 hours
    
    // Short delay to show loading, then redirect
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center" 
         style={{ background: 'var(--vm-background)' }}>
      <div className="text-center">
        <div className="relative">
          <div 
            className="h-16 w-16 rounded-full flex items-center justify-center vm-glow mx-auto mb-4"
            style={{ background: 'var(--vm-gradient-primary)' }}
          >
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--vm-background)' }} />
          </div>
        </div>
        <h2 className="vm-heading text-xl font-semibold mb-2">Entering Demo Mode</h2>
        <p className="vm-text-muted">Setting up your demo environment...</p>
      </div>
    </div>
  )
}