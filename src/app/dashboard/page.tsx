'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Phone, Clock, Activity, Brain } from 'lucide-react'
import { AssistantCard } from '@/components/dashboard/assistant-card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { SubscriptionCard } from '@/components/subscription/subscription-card'
import { motion } from 'framer-motion'
import type { Database } from '@/types/database'

type Assistant = Database['public']['Tables']['user_assistants']['Row']

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
        body: JSON.stringify({ is_disabled: isActive })
      })

      if (res.ok) {
        setAssistants(prev => 
          prev.map(a => a.id === assistantId ? { ...a, is_disabled: isActive } : a)
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
        {/* Subtle Background Pattern */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-5">
          <div className="absolute inset-0" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at 20% 80%, var(--vm-cyan) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--vm-violet) 0%, transparent 50%)',
                 backgroundSize: '600px 600px'
               }} />
        </div>

        {/* Clean Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 p-6 rounded-2xl border"
               style={{ 
                 backgroundColor: 'var(--vm-primary-surface)',
                 borderColor: 'var(--vm-border-default)'
               }}>
            <div className="space-y-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full" 
                     style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--vm-success-green)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--vm-success-green)' }}>Online</span>
                </div>
              </div>
              
              {/* Main Title */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight" style={{ color: 'var(--vm-primary-light)' }}>
                  Voice Matrix Dashboard
                </h1>
                <p className="text-lg mt-2" style={{ color: 'var(--vm-neutral-400)' }}>
                  Manage your AI voice agents and monitor performance
                </p>
              </motion.div>
            </div>
            
            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 border"
                style={{ 
                  backgroundColor: 'transparent',
                  borderColor: 'var(--vm-neutral-700)',
                  color: 'var(--vm-neutral-200)'
                }}
                onClick={() => router.push('/dashboard/assistants')}
              >
                <Brain className="mr-2 h-4 w-4 inline" />
                Manage Assistants
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                style={{ 
                  background: 'var(--vm-gradient-primary)',
                  color: '#FFFFFF'
                }}
                onClick={() => router.push('/dashboard/assistants/new')}
              >
                <Plus className="mr-2 h-4 w-4 inline" />
                Create Assistant
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* AI Assistants */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-6 rounded-xl border transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--vm-primary-surface)',
              borderColor: 'var(--vm-border-default)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                  <Brain className="h-5 w-5" style={{ color: 'var(--vm-orange)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--vm-text-muted)' }}>AI Assistants</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? <div className="w-8 h-6 bg-gray-700 rounded animate-pulse" /> : stats.totalAssistants}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
              Active voice agent networks
            </div>
          </motion.div>

          {/* Active Calls */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-6 rounded-xl border transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--vm-primary-surface)',
              borderColor: 'var(--vm-border-default)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <Phone className="h-5 w-5" style={{ color: 'var(--vm-emerald)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--vm-text-muted)' }}>Active Calls</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? <div className="w-8 h-6 bg-gray-700 rounded animate-pulse" /> : stats.activeCalls}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--vm-emerald)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--vm-emerald)' }}>Live</span>
              </div>
            </div>
            <div className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
              Real-time conversations
            </div>
          </motion.div>

          {/* Total Minutes */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-6 rounded-xl border transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--vm-primary-surface)',
              borderColor: 'var(--vm-border-default)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
                  <Clock className="h-5 w-5" style={{ color: 'var(--vm-cyan)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--vm-text-muted)' }}>Total Minutes</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? <div className="w-12 h-6 bg-gray-700 rounded animate-pulse" /> : stats.totalMinutes.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
              Voice processing time
            </div>
          </motion.div>

          {/* System Status */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="p-6 rounded-xl border transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--vm-primary-surface)',
              borderColor: 'var(--vm-border-default)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <Activity className="h-5 w-5" style={{ color: 'var(--vm-violet)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--vm-text-muted)' }}>System Health</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                    {loading ? <div className="w-12 h-6 bg-gray-700 rounded animate-pulse" /> : '99.9%'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--vm-emerald)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--vm-emerald)' }}>Optimal</span>
              </div>
            </div>
            <div className="text-xs" style={{ color: 'var(--vm-text-muted)' }}>
              All systems operational
            </div>
          </motion.div>
        </motion.div>

        {/* Subscription Overview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <SubscriptionCard variant="compact" />
        </motion.div>

        {/* AI Assistants Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--vm-text-primary)' }}>
                AI Assistants
              </h2>
              <p className="text-sm" style={{ color: 'var(--vm-text-muted)' }}>
                Manage and monitor your voice AI agents
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" 
                   style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--vm-emerald)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--vm-emerald)' }}>
                  {stats.totalAssistants} Active
                </span>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-6 rounded-xl border" 
                     style={{ backgroundColor: 'var(--vm-surface)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-700 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-800 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                    <div className="h-12 bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-xl border"
                 style={{ backgroundColor: 'var(--vm-surface)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                  <Brain className="w-8 h-8" style={{ color: 'var(--vm-orange)' }} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
                    No AI Assistants Yet  
                  </h3>
                  <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--vm-text-muted)' }}>
                    Create your first AI assistant to start processing voice conversations
                  </p>
                </div>
                
                <button
                  className="px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{ backgroundColor: 'var(--vm-orange)', color: 'white' }}
                  onClick={() => router.push('/dashboard/assistants/new')}
                >
                  <Plus className="mr-2 h-4 w-4 inline" />
                  Create Your First Assistant
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assistants.map((assistant, index) => (
                <motion.div
                  key={assistant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.6 }}
                  whileHover={{ y: -4 }}
                >
                  <AssistantCard
                    assistant={assistant}
                    onToggle={() => handleAssistantToggle(assistant.id, !assistant.is_disabled)}
                    onEdit={() => router.push(`/dashboard/assistants/${assistant.id}/edit`)}
                    onDelete={() => handleAssistantDelete(assistant.id)}
                    onViewDetails={() => router.push(`/dashboard/assistants/${assistant.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}