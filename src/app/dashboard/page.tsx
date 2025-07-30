'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Phone, BarChart3, Clock, Users, Mic, Zap, Activity, TrendingUp, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AssistantCard } from '@/components/dashboard/assistant-card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['assistants']['Row']

interface DashboardStats {
  totalAssistants: number
  activeCalls: number
  totalMinutes: number
  totalLeads: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalAssistants: 0,
    activeCalls: 0,
    totalMinutes: 0,
    totalLeads: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch assistants
      const assistantsRes = await fetch('/api/assistants')
      const assistantsData = await assistantsRes.json()
      
      if (assistantsData.success) {
        setAssistants(assistantsData.data || [])
        setStats(prev => ({ ...prev, totalAssistants: assistantsData.data?.length || 0 }))
      }

      // TODO: Fetch stats when analytics backend is rebuilt
      // const statsRes = await fetch('/api/dashboard/stats')
      // const statsData = await statsRes.json()
      // if (statsData.success) {
      //   setStats(statsData.data)
      // }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssistantToggle = async (assistantId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/assistants/${assistantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (res.ok) {
        setAssistants(prev => 
          prev.map(a => a.id === assistantId ? { ...a, is_active: !isActive } : a)
        )
      }
    } catch (error) {
      console.error('Failed to toggle assistant:', error)
    }
  }

  const handleAssistantDelete = async (assistantId: string) => {
    if (!confirm('Are you sure you want to delete this assistant?')) return

    try {
      const res = await fetch(`/api/assistants/${assistantId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setAssistants(prev => prev.filter(a => a.id !== assistantId))
        setStats(prev => ({ ...prev, totalAssistants: prev.totalAssistants - 1 }))
      }
    } catch (error) {
      console.error('Failed to delete assistant:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Revolutionary Header */}
        <div className="relative">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--vm-primary)]/5 to-transparent blur-3xl" />
          
          <div className="relative flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full animate-pulse" style={{ background: 'var(--vm-success)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--vm-success)' }}>
                    System Online
                  </span>
                </div>
              </div>
              <h1 className="vm-heading text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Voice Matrix Command Center
              </h1>
              <p className="text-lg vm-text-muted max-w-2xl">
                Orchestrate your AI voice intelligence platform with advanced analytics and real-time monitoring.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 border hover:scale-105"
                style={{ 
                  borderColor: 'var(--vm-border)',
                  color: 'var(--vm-text-primary)',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}
                onClick={() => router.push('/dashboard/assistants')}
              >
                <Users className="mr-2 h-5 w-5 inline" />
                Manage Assistants
              </button>
              <button 
                className="vm-button-primary px-6 py-3 rounded-xl font-semibold text-sm hover:scale-105 flex items-center justify-center gap-2"
                onClick={() => router.push('/dashboard/assistants/new')}
              >
                <Zap className="h-5 w-5" />
                Create AI Assistant
              </button>
            </div>
          </div>
        </div>

        {/* Revolutionary Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* AI Assistants Card */}
          <div className="vm-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" 
                     style={{ background: 'var(--vm-gradient-primary)' }}>
                  <Mic className="h-6 w-6" style={{ color: 'var(--vm-background)' }} />
                </div>
                <div>
                  <p className="text-sm vm-text-muted font-medium">AI Assistants</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? '...' : stats.totalAssistants}
                  </p>
                </div>
              </div>
              <TrendingUp className="h-5 w-5" style={{ color: 'var(--vm-success)' }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full" style={{ background: 'var(--vm-surface-elevated)' }}>
                <div className="h-1.5 rounded-full" style={{ 
                  background: 'var(--vm-gradient-primary)', 
                  width: `${Math.min(100, (stats.totalAssistants / 10) * 100)}%` 
                }} />
              </div>
              <span className="text-xs vm-text-muted">Active</span>
            </div>
          </div>

          {/* Active Calls Card */}
          <div className="vm-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, var(--vm-accent), var(--vm-success))' }}>
                  <Activity className="h-6 w-6" style={{ color: 'var(--vm-background)' }} />
                </div>
                <div>
                  <p className="text-sm vm-text-muted font-medium">Active Calls</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? '...' : stats.activeCalls}
                  </p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vm-success)' }} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--vm-success)' }}>Live</span>
              <div className="flex-1 text-xs vm-text-muted text-right">Real-time monitoring</div>
            </div>
          </div>

          {/* Total Minutes Card */}
          <div className="vm-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, var(--vm-warning), var(--vm-primary))' }}>
                  <Clock className="h-6 w-6" style={{ color: 'var(--vm-background)' }} />
                </div>
                <div>
                  <p className="text-sm vm-text-muted font-medium">Total Minutes</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? '...' : stats.totalMinutes.toLocaleString()}
                  </p>
                </div>
              </div>
              <Target className="h-5 w-5" style={{ color: 'var(--vm-warning)' }} />
            </div>
            <div className="text-xs vm-text-muted">Monthly usage tracking</div>
          </div>

          {/* Performance Card */}
          <div className="vm-card p-6 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" 
                     style={{ background: 'linear-gradient(135deg, var(--vm-success), var(--vm-accent))' }}>
                  <BarChart3 className="h-6 w-6" style={{ color: 'var(--vm-background)' }} />
                </div>
                <div>
                  <p className="text-sm vm-text-muted font-medium">Performance</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? '...' : '98.5%'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1 w-1 rounded-full" style={{ background: 'var(--vm-success)' }} />
                <div className="h-1 w-1 rounded-full" style={{ background: 'var(--vm-success)' }} />
                <div className="h-1 w-1 rounded-full" style={{ background: 'var(--vm-success)' }} />
              </div>
            </div>
            <div className="text-xs vm-text-muted">System uptime & reliability</div>
          </div>
        </div>

        {/* Enhanced Assistants Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="vm-heading text-3xl font-bold">AI Assistant Fleet</h2>
              <p className="vm-text-muted mt-1">Manage your intelligent voice agents</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" 
                   style={{ background: 'var(--vm-surface-elevated)' }}>
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--vm-success)' }} />
                <span className="text-xs font-medium vm-text-muted">All Systems Operational</span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No assistants yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first AI voice assistant to get started
                </p>
                <Button onClick={() => router.push('/dashboard/assistants/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assistant
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assistants.map(assistant => (
                <AssistantCard
                  key={assistant.id}
                  assistant={assistant}
                  onToggle={() => handleAssistantToggle(assistant.id, assistant.is_active)}
                  onEdit={() => router.push(`/dashboard/assistants/${assistant.id}/edit`)}
                  onDelete={() => handleAssistantDelete(assistant.id)}
                  onViewDetails={() => router.push(`/dashboard/assistants/${assistant.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}