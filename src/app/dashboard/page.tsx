'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Clock, Activity, Brain, Settings } from 'lucide-react'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {client?.company_name}
            </h1>
            <p className="text-gray-600">View your assigned assistants and track performance</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assigned Assistants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssistants}</p>
              </div>
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
              </div>
              <Phone className="h-8 w-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Minutes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Assistants Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Assistants</h2>
                <p className="text-sm text-gray-600">View and manage your assigned AI assistants</p>
              </div>
              <button
                onClick={() => router.push('/dashboard/assistants')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View All Assistants
              </button>
            </div>
          </div>

          <div className="p-6">
            {assistants.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assistants assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Your administrator will assign assistants to your account.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Contact your administrator if you need assistance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(assistants) ? assistants.slice(0, 6) : []).map((assistant, index) => (
                  <motion.div
                    key={assistant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <AssistantCard assistant={assistant} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}