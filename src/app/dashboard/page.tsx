'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Phone, BarChart3, Clock, Users } from 'lucide-react'
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your AI voice assistants
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard/assistants')}
              size="lg"
            >
              <Users className="mr-2 h-5 w-5" />
              Manage Assistants
            </Button>
            <Button 
              onClick={() => router.push('/dashboard/assistants/new')}
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Assistant
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Assistants"
            value={stats.totalAssistants}
            icon={Users}
            loading={loading}
          />
          <StatsCard
            title="Active Calls"
            value={stats.activeCalls}
            icon={Phone}
            loading={loading}
          />
          <StatsCard
            title="Total Minutes"
            value={stats.totalMinutes}
            icon={Clock}
            loading={loading}
          />
          <StatsCard
            title="Leads Generated"
            value={stats.totalLeads}
            icon={BarChart3}
            loading={loading}
          />
        </div>

        {/* Assistants Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Assistants</h2>
          
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