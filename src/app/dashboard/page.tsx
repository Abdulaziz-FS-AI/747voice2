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
      
      if (assistantsData && Array.isArray(assistantsData)) {
        setAssistants(assistantsData)
        setStats(prev => ({ ...prev, totalAssistants: assistantsData.length }))
      } else {
        setAssistants([])
        setStats(prev => ({ ...prev, totalAssistants: 0 }))
      }

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
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
              <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Loading Dashboard</p>
              <p className="text-xs text-gray-500">Fetching your latest data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back, {client?.company_name}
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor your AI assistants and track performance metrics in real-time
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/settings')}
            className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </motion.button>
        </motion.div>

        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">AI Assistants</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalAssistants}</p>
                <p className="text-xs text-gray-500 mt-1">Active and ready</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
                <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-300">
                <Phone className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Call Duration</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalMinutes}m</p>
                <p className="text-xs text-gray-500 mt-1">Total minutes</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Avg performance</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors duration-300">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
        </div>

        {/* Modern Assistants Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Your AI Assistants</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage and monitor your assigned AI assistants
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/dashboard/assistants')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View All Assistants
              </motion.button>
            </div>
          </div>

          <div className="p-8">
            {assistants.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center py-16"
              >
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <Brain className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="h-3 w-3 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">No assistants assigned yet</h3>
                <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                  Your administrator will assign AI assistants to your account. 
                  Once assigned, you'll see them here.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>Contact your administrator for assistance</span>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(assistants) ? assistants.slice(0, 6) : []).map((assistant, index) => (
                  <motion.div
                    key={assistant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <AssistantCard assistant={assistant} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}