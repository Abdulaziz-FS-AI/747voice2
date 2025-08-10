'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Plus, Phone, BarChart3, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function TestDemoPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleCreateAssistant = async () => {
    setIsCreating(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Test Assistant ${Date.now()}`,
          company_name: 'Demo Company',
          personality: 'professional',
          personality_traits: ['professional', 'helpful'],
          first_message: 'Hello! How can I help you today?',
          first_message_mode: 'assistant-speaks-first',
          background_sound: 'office',
          max_call_duration: 300,
          structured_questions: []
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create assistant')
      }

      setSuccess(`Assistant created successfully! ID: ${data.data.id}`)
      
      // Refresh the page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--vm-background)' }}>
      {/* Sidebar */}
      <div className="w-64 border-r" style={{ borderColor: 'var(--vm-border)', background: 'var(--vm-surface)' }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center vm-glow"
                 style={{ background: 'var(--vm-gradient-primary)' }}>
              <Mic className="h-5 w-5" style={{ color: 'var(--vm-background)' }} />
            </div>
            <div>
              <h1 className="vm-heading text-lg font-bold">Voice Matrix</h1>
              <p className="vm-text-muted text-xs">Demo Test</p>
            </div>
          </div>

          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
              <BarChart3 className="h-4 w-4 vm-text-muted" />
              <span className="vm-text-primary">Dashboard</span>
            </Link>
            <Link href="/dashboard/assistants" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
              <Mic className="h-4 w-4 vm-text-muted" />
              <span className="vm-text-primary">Assistants</span>
            </Link>
            <Link href="/dashboard/phone-numbers" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
              <Phone className="h-4 w-4 vm-text-muted" />
              <span className="vm-text-primary">Phone Numbers</span>
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5">
              <Settings className="h-4 w-4 vm-text-muted" />
              <span className="vm-text-primary">Settings</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="vm-heading text-3xl font-bold mb-2">Test Demo System</h2>
            <p className="vm-text-muted">Testing the Voice Matrix demo system without normal auth flow</p>
          </div>

          <Card className="vm-card mb-6">
            <CardHeader>
              <CardTitle className="vm-heading">Demo System Info</CardTitle>
              <CardDescription className="vm-text-muted">
                This is a test page that bypasses normal authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="vm-text-muted">Auth Mode:</span>
                  <span className="vm-text-primary font-mono">auth-simple.ts</span>
                </div>
                <div className="flex justify-between">
                  <span className="vm-text-muted">Test User:</span>
                  <span className="vm-text-primary font-mono">test@voicematrix.ai</span>
                </div>
                <div className="flex justify-between">
                  <span className="vm-text-muted">Max Assistants:</span>
                  <span className="vm-text-primary font-mono">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="vm-text-muted">Max Minutes:</span>
                  <span className="vm-text-primary font-mono">10</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="vm-card">
            <CardHeader>
              <CardTitle className="vm-heading">Create Test Assistant</CardTitle>
              <CardDescription className="vm-text-muted">
                Test the assistant creation API directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg border" style={{ 
                    borderColor: 'var(--vm-error)', 
                    background: 'rgba(239, 68, 68, 0.1)' 
                  }}>
                    <p className="text-sm" style={{ color: 'var(--vm-error)' }}>{error}</p>
                  </div>
                )}
                
                {success && (
                  <div className="p-3 rounded-lg border" style={{ 
                    borderColor: 'var(--vm-success)', 
                    background: 'rgba(34, 197, 94, 0.1)' 
                  }}>
                    <p className="text-sm" style={{ color: 'var(--vm-success)' }}>{success}</p>
                  </div>
                )}

                <Button 
                  onClick={handleCreateAssistant}
                  disabled={isCreating}
                  className="vm-button-primary"
                >
                  {isCreating ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Test Assistant
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--vm-border)' }}>
                  <p className="vm-text-muted text-sm mb-3">Quick Links:</p>
                  <div className="flex gap-3">
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm">
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link href="/dashboard/assistants">
                      <Button variant="outline" size="sm">
                        View Assistants
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}