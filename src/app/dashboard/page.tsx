'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Phone, BarChart3, Clock, Users, Mic, Zap, Activity, TrendingUp, Target, Brain, Sparkles, Radio, Cpu, Globe, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AssistantCard } from '@/components/dashboard/assistant-card'
import { StatsCard } from '@/components/dashboard/stats-card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, useScroll, useTransform } from 'framer-motion'
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
      <div className="space-y-8 relative">
        {/* Advanced Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-40 w-80 h-80 rounded-full opacity-20 animate-pulse"
               style={{ background: 'radial-gradient(circle, var(--vm-orange-primary) 0%, transparent 70%)' }} />
          <div className="absolute bottom-40 -right-20 w-96 h-96 rounded-full opacity-15 animate-pulse"
               style={{ background: 'radial-gradient(circle, var(--vm-violet) 0%, transparent 70%)', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10 animate-pulse"
               style={{ background: 'radial-gradient(circle, var(--vm-cyan) 0%, transparent 70%)', animationDelay: '4s' }} />
        </div>

        {/* Futuristic Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          {/* Neural Network Pattern Background */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              <defs>
                <pattern id="neural" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="2" fill="var(--vm-orange-primary)" opacity="0.3" />
                  <line x1="0" y1="20" x2="40" y2="20" stroke="var(--vm-orange-primary)" strokeWidth="0.5" opacity="0.2" />
                  <line x1="20" y1="0" x2="20" y2="40" stroke="var(--vm-orange-primary)" strokeWidth="0.5" opacity="0.2" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#neural)" />
            </svg>
          </div>
          
          <div className="relative flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8 p-8 rounded-2xl"
               style={{ 
                 background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)',
                 border: '1px solid var(--vm-border-brand)',
                 backdropFilter: 'blur(10px)'
               }}>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="flex items-center gap-3 px-4 py-2 rounded-full"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--vm-success), var(--vm-emerald))',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Radio className="h-4 w-4 text-white animate-pulse" />
                  <span className="text-sm font-bold text-white">
                    NEURAL MATRIX ONLINE
                  </span>
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                </motion.div>
              </div>
              
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight"
              >
                <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                  Voice Matrix
                </span>
                <br />
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                  Neural Command
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-xl vm-text-muted max-w-2xl leading-relaxed"
              >
                Advanced AI orchestration platform with quantum-level voice intelligence, 
                real-time neural processing, and predictive analytics integration.
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 backdrop-blur-sm relative overflow-hidden group"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--vm-border-brand)',
                  color: 'var(--vm-pure)'
                }}
                onClick={() => router.push('/dashboard/assistants')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Brain className="mr-3 h-5 w-5 inline" />
                Neural Fleet Management
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-2xl font-semibold text-sm relative overflow-hidden group"
                style={{ 
                  background: 'var(--vm-gradient-brand)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)'
                }}
                onClick={() => router.push('/dashboard/assistants/new')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Sparkles className="mr-3 h-5 w-5 inline animate-pulse" />
                Deploy New AI Agent
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Quantum Analytics Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {/* Neural Assistants Card */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative p-6 rounded-2xl backdrop-blur-sm border overflow-hidden group cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)',
              border: '1px solid var(--vm-border-brand)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="h-14 w-14 rounded-2xl flex items-center justify-center relative"
                    style={{ background: 'var(--vm-gradient-brand)', boxShadow: '0 0 20px rgba(255, 107, 53, 0.4)' }}
                  >
                    <Brain className="h-7 w-7 text-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-400 animate-pulse" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--vm-gray-300)' }}>
                      Neural Agents
                    </p>
                    <motion.p 
                      key={stats.totalAssistants}
                      initial={{ scale: 1.2, color: 'var(--vm-orange-primary)' }}
                      animate={{ scale: 1, color: 'var(--vm-pure)' }}
                      className="text-3xl font-bold"
                    >
                      {loading ? (
                        <div className="w-8 h-8 rounded bg-gray-700 animate-pulse" />
                      ) : (
                        stats.totalAssistants
                      )}
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Cpu className="h-6 w-6" style={{ color: 'var(--vm-success)' }} />
                </motion.div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--vm-gray-400)' }}>
                    Processing Power
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--vm-orange-primary)' }}>
                    {Math.min(100, (stats.totalAssistants / 10) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--vm-surface-elevated)' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.totalAssistants / 10) * 100)}%` }}
                    transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                    className="h-2 rounded-full"
                    style={{ background: 'var(--vm-gradient-brand)' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quantum Communications Card */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative p-6 rounded-2xl backdrop-blur-sm border overflow-hidden group cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], boxShadow: ['0 0 20px rgba(16, 185, 129, 0.4)', '0 0 30px rgba(16, 185, 129, 0.6)', '0 0 20px rgba(16, 185, 129, 0.4)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-14 w-14 rounded-2xl flex items-center justify-center relative"
                    style={{ background: 'linear-gradient(135deg, var(--vm-success), var(--vm-cyan))' }}
                  >
                    <Radio className="h-7 w-7 text-white" />
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-2xl border-2 border-white/30"
                    />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--vm-gray-300)' }}>
                      Live Channels
                    </p>
                    <motion.p 
                      key={stats.activeCalls}
                      initial={{ scale: 1.2, color: 'var(--vm-success)' }}
                      animate={{ scale: 1, color: 'var(--vm-pure)' }}
                      className="text-3xl font-bold"
                    >
                      {loading ? (
                        <div className="w-8 h-8 rounded bg-gray-700 animate-pulse" />
                      ) : (
                        stats.activeCalls
                      )}
                    </motion.p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="h-3 w-3 rounded-full"
                    style={{ background: 'var(--vm-success)', boxShadow: '0 0 10px var(--vm-success)' }}
                  />
                  <span className="text-xs font-bold" style={{ color: 'var(--vm-success)' }}>LIVE</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--vm-gray-400)' }}>Quantum Sync Active</span>
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" style={{ color: 'var(--vm-cyan)' }} />
                  <span style={{ color: 'var(--vm-cyan)' }}>Global Network</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Temporal Analytics Card */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative p-6 rounded-2xl backdrop-blur-sm border overflow-hidden group cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(255, 107, 53, 0.02) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div 
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="h-14 w-14 rounded-2xl flex items-center justify-center relative"
                    style={{ background: 'linear-gradient(135deg, var(--vm-warning), var(--vm-orange-primary))', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}
                  >
                    <Clock className="h-7 w-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--vm-gray-300)' }}>
                      Neural Minutes
                    </p>
                    <motion.p 
                      key={stats.totalMinutes}
                      initial={{ scale: 1.2, color: 'var(--vm-warning)' }}
                      animate={{ scale: 1, color: 'var(--vm-pure)' }}
                      className="text-3xl font-bold"
                    >
                      {loading ? (
                        <div className="w-12 h-8 rounded bg-gray-700 animate-pulse" />
                      ) : (
                        stats.totalMinutes.toLocaleString()
                      )}
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Target className="h-6 w-6" style={{ color: 'var(--vm-warning)' }} />
                </motion.div>
              </div>
              
              <div className="text-xs" style={{ color: 'var(--vm-gray-400)' }}>
                <span>Temporal Processing • </span>
                <span style={{ color: 'var(--vm-warning)' }}>Quantum Efficiency: 99.7%</span>
              </div>
            </div>
          </motion.div>

          {/* System Integrity Card */}
          <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="relative p-6 rounded-2xl backdrop-blur-sm border overflow-hidden group cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <motion.div 
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(139, 92, 246, 0.4)', 
                        '0 0 30px rgba(16, 185, 129, 0.4)', 
                        '0 0 20px rgba(139, 92, 246, 0.4)'
                      ] 
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="h-14 w-14 rounded-2xl flex items-center justify-center relative"
                    style={{ background: 'linear-gradient(135deg, var(--vm-violet), var(--vm-success))' }}
                  >
                    <Shield className="h-7 w-7 text-white" />
                    <motion.div 
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-1 rounded-xl border border-white/20"
                    />
                  </motion.div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--vm-gray-300)' }}>
                      System Health
                    </p>
                    <motion.p 
                      initial={{ scale: 1.2, color: 'var(--vm-success)' }}
                      animate={{ scale: 1, color: 'var(--vm-pure)' }}
                      className="text-3xl font-bold"
                    >
                      {loading ? (
                        <div className="w-12 h-8 rounded bg-gray-700 animate-pulse" />
                      ) : (
                        '99.9%'
                      )}
                    </motion.p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [1, 0.5, 1]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--vm-success)' }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-xs" style={{ color: 'var(--vm-gray-400)' }}>
                <span>Neural Security • </span>
                <span style={{ color: 'var(--vm-success)' }}>Quantum Encryption Active</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Neural Fleet Command Center */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="space-y-8"
        >
          <div className="relative">
            {/* Section Background Pattern */}
            <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden">
              <div className="w-full h-full" 
                   style={{ 
                     backgroundImage: `radial-gradient(circle at 25% 25%, var(--vm-orange-primary) 0%, transparent 50%), 
                                      radial-gradient(circle at 75% 75%, var(--vm-violet) 0%, transparent 50%)`,
                     backgroundSize: '400px 400px'
                   }} />
            </div>
            
            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 p-6 rounded-3xl backdrop-blur-sm"
                 style={{ 
                   background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.02) 0%, rgba(139, 92, 246, 0.02) 100%)',
                   border: '1px solid var(--vm-border-subtle)'
                 }}>
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4, duration: 0.6 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--vm-orange-primary)' }} />
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--vm-orange-primary)' }}>
                    Neural Fleet Management
                  </span>
                </motion.div>
                
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5, duration: 0.6 }}
                  className="text-4xl lg:text-5xl font-bold leading-tight"
                >
                  <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    AI Agent
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-orange-400 to-violet-400 bg-clip-text text-transparent">
                    Command Fleet
                  </span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6, duration: 0.6 }}
                  className="text-lg vm-text-muted max-w-2xl"
                >
                  Deploy, monitor, and orchestrate your quantum-enabled AI voice agents with neural precision.
                </motion.p>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.7, duration: 0.6 }}
                className="flex items-center gap-4"
              >
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-sm" 
                     style={{ 
                       background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
                       border: '1px solid rgba(16, 185, 129, 0.2)'
                     }}>
                  <motion.div 
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--vm-success)', boxShadow: '0 0 10px var(--vm-success)' }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </motion.div>
                  <span className="text-sm font-bold" style={{ color: 'var(--vm-success)' }}>
                    QUANTUM MATRIX ONLINE
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
          
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.6 }}
                  className="p-6 rounded-2xl backdrop-blur-sm"
                  style={{ 
                    background: 'var(--vm-gradient-surface)',
                    border: '1px solid var(--vm-border-subtle)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-700 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-800 rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 bg-gray-800 rounded animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-700 rounded animate-pulse flex-1" />
                        <div className="h-6 bg-gray-700 rounded animate-pulse flex-1" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : assistants.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="text-center py-16 px-8 rounded-3xl relative overflow-hidden"
              style={{ 
                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.02) 0%, rgba(139, 92, 246, 0.02) 100%)',
                border: '1px solid var(--vm-border-subtle)'
              }}
            >
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <defs>
                    <pattern id="empty-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="1" fill="var(--vm-orange-primary)" opacity="0.3" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#empty-grid)" />
                </svg>
              </div>
              
              <div className="relative space-y-6">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
                  style={{ 
                    background: 'var(--vm-gradient-brand)',
                    boxShadow: '0 0 40px rgba(255, 107, 53, 0.3)'
                  }}
                >
                  <Brain className="w-12 h-12 text-white" />
                </motion.div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold" style={{ color: 'var(--vm-pure)' }}>
                    Neural Fleet Awaiting Deployment
                  </h3>
                  <p className="text-lg vm-text-muted max-w-md mx-auto">
                    Initialize your first quantum AI agent to begin neural voice processing operations
                  </p>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-2xl font-bold text-sm relative overflow-hidden group"
                  style={{ 
                    background: 'var(--vm-gradient-brand)',
                    color: 'white',
                    boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)'
                  }}
                  onClick={() => router.push('/dashboard/assistants/new')}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Sparkles className="mr-3 h-5 w-5 inline animate-pulse" />
                  Deploy First Neural Agent
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.8 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {assistants.map((assistant, index) => (
                <motion.div
                  key={assistant.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <AssistantCard
                    assistant={assistant}
                    onToggle={() => handleAssistantToggle(assistant.id, assistant.is_active)}
                    onEdit={() => router.push(`/dashboard/assistants/${assistant.id}/edit`)}
                    onDelete={() => handleAssistantDelete(assistant.id)}
                    onViewDetails={() => router.push(`/dashboard/assistants/${assistant.id}`)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  )
}