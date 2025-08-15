'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, Activity, Brain, Settings, TrendingUp, Zap, BarChart3, Users } from 'lucide-react'
import { AssistantCard } from '@/components/dashboard/assistant-card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { motion } from 'framer-motion'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { ClientAssistant, DashboardAnalytics } from '@/types/client'

// Import our new premium components
import { 
  MetricsCard, 
  ActiveAssistantsCard, 
  TotalCallsCard, 
  CallDurationCard, 
  SuccessRateCard 
} from '@/components/ui/metrics-card'
import { NoAssistantsEmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalAssistants: number
  totalCalls: number
  totalMinutes: number
  successRate: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [assistants, setAssistants] = useState<ClientAssistant[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalAssistants: 0,
    totalCalls: 0,
    totalMinutes: 0,
    successRate: 0
  })
  const [dashboardLoading, setDashboardLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchDashboardData()
    }
  }, [isAuthenticated, isLoading])

  const fetchDashboardData = async () => {
    try {
      setDashboardLoading(true)
      
      // Fetch assistants
      const assistantsRes = await authenticatedFetch('/api/assistants')
      const assistantsData = await handleAuthenticatedResponse<ClientAssistant[]>(assistantsRes)
      
      // Ensure assistantsData is always an array
      const safeAssistants = Array.isArray(assistantsData) ? assistantsData : []
      setAssistants(safeAssistants)
      setStats(prev => ({ ...prev, totalAssistants: safeAssistants.length }))

      // Fetch analytics
      try {
        const analyticsRes = await authenticatedFetch('/api/analytics/dashboard?days=30')
        const analyticsJson = await analyticsRes.json()
        
        if (analyticsJson.success && analyticsJson.data) {
          const overview = analyticsJson.data.overview || {}
          setStats(prev => ({
            ...prev,
            totalCalls: Number(overview.totalCalls) || 0,
            totalMinutes: Math.round(Number(overview.totalDurationHours || 0) * 60) || 0,
            successRate: Number(overview.successRate) || 0
          }))
        }
      } catch (analyticsError) {
        console.log('[Dashboard] Analytics not available yet:', analyticsError)
        // Analytics is optional for now
      }
    } catch (error) {
      console.error('[Dashboard] Failed to fetch dashboard data:', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  if (isLoading || dashboardLoading) {
    return (
      <DashboardLayout>
        <div className="app-main">
          {/* Premium Loading State */}
          <motion.div 
            className="flex items-center justify-center min-h-[60vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-6">
              {/* Elegant Loading Spinner */}
              <div className="relative">
                <motion.div 
                  className="w-16 h-16 rounded-full border-2 border-vm-glass-border bg-vm-gradient-glass backdrop-blur-lg"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                  className="absolute top-1 left-1 w-14 h-14 rounded-full border-2 border-vm-primary border-t-transparent"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-vm-primary vm-animate-pulse-slow" />
                </div>
              </div>
              
              {/* Loading Text */}
              <div className="text-center space-y-2">
                <motion.h3 
                  className="vm-text-lg font-semibold vm-text-bright"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Loading Dashboard
                </motion.h3>
                <p className="vm-text-small vm-subheading-contrast">
                  Fetching your latest performance data...
                </p>
              </div>
              
              {/* Loading Skeletons */}
              <div className="w-full max-w-4xl space-y-6 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-32 vm-loading-skeleton rounded-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    />
                  ))}
                </div>
                <motion.div
                  className="h-64 vm-loading-skeleton rounded-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="app-main">
        <div className="space-y-8">
          {/* Executive Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div className="space-y-2">
              <motion.h1 
                className="vm-display-large vm-text-gradient vm-heading-contrast"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Welcome back, {client?.company_name}
              </motion.h1>
              <motion.p 
                className="vm-text-lead vm-text-bright max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Monitor your AI assistants and track performance metrics in real-time
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/settings')}
                leftIcon={<Settings className="h-5 w-5" />}
                asMotion
                motionProps={{
                  whileHover: { scale: 1.02, y: -2 },
                  whileTap: { scale: 0.98 },
                }}
                className="vm-hover-glow"
              >
                Settings
              </Button>
            </motion.div>
          </motion.div>

          {/* Premium Metrics Grid */}
          <motion.div 
            className="metrics-grid vm-stagger-container"
            initial="hidden"
            animate="visible"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <ActiveAssistantsCard 
                count={stats.totalAssistants}
                change="+2"
                changeType="positive"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <TotalCallsCard 
                count={stats.totalCalls}
                change="+12%"
                changeType="positive"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <CallDurationCard 
                duration={`${stats.totalMinutes}m`}
                change="+8%"
                changeType="positive"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <SuccessRateCard 
                rate={`${stats.successRate}%`}
                change="+5%"
                changeType="positive"
              />
            </motion.div>
          </motion.div>

          {/* Premium Assistants Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="vm-card relative overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-vm-glass-border/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <motion.h2 
                    className="vm-display-small vm-heading-contrast"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                  >
                    Your AI Assistants
                  </motion.h2>
                  <motion.p 
                    className="vm-text-body vm-subheading-contrast"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                  >
                    Manage and monitor your assigned AI assistants
                  </motion.p>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                >
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => router.push('/dashboard/assistants')}
                    leftIcon={<BarChart3 className="h-5 w-5" />}
                    asMotion
                    motionProps={{
                      whileHover: { scale: 1.02, y: -2 },
                      whileTap: { scale: 0.98 },
                    }}
                    className="vm-hover-glow"
                  >
                    View All Assistants
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {assistants.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                >
                  <NoAssistantsEmptyState
                    onCreateAssistant={() => router.push('/dashboard/assistants')}
                    onLearnMore={() => router.push('/dashboard/help')}
                  />
                </motion.div>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 1.3,
                      },
                    },
                  }}
                >
                  {(Array.isArray(assistants) ? assistants.slice(0, 6) : []).map((assistant, index) => (
                    <motion.div
                      key={assistant.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { 
                          opacity: 1, 
                          y: 0,
                          transition: { duration: 0.6 }
                        },
                      }}
                      className="vm-hover-lift"
                    >
                      <AssistantCard assistant={assistant} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}