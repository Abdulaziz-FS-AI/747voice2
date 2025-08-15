'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePinAuth } from '@/lib/contexts/pin-auth-context'
import { 
  BarChart3, 
  TrendingUp, 
  Phone, 
  Clock, 
  Activity,
  Settings,
  Calendar,
  AlertCircle,
  Download,
  RefreshCw,
  Filter,
  Zap,
  Target,
  Users
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { DashboardAnalytics, CallLog } from '@/types/client'

interface AnalyticsStats {
  totalCalls: number
  totalDurationHours: number
  avgDurationMinutes: number
  successRate: number
  recentCalls: CallLog[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // days

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAnalytics()
    }
  }, [isAuthenticated, isLoading, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const response = await authenticatedFetch(`/api/analytics/dashboard?days_back=${timeRange}`)
      const data = await handleAuthenticatedResponse<DashboardAnalytics>(response)
      
      if (data) {
        // Transform the data to match our interface
        setAnalytics({
          totalCalls: Number(data.total_calls) || 0,
          totalDurationHours: Number(data.total_duration_hours) || 0,
          avgDurationMinutes: Number(data.avg_duration_minutes) || 0,
          successRate: Number(data.success_rate) || 0,
          recentCalls: data.recent_calls || []
        })
      }
    } catch (error) {
      console.error('[Analytics] Failed to fetch analytics:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
  }

  if (isLoading || loading) {
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
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor performance metrics and insights in real-time</p>
          </div>
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }}>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48 bg-white border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-all duration-200">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fetchAnalytics()}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/dashboard/settings')}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </motion.button>
          </div>
        </motion.div>

        {/* Modern Metrics Grid */}
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
                <p className="text-sm font-medium text-blue-600 mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900">{analytics?.totalCalls || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Last {timeRange} days</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                <Phone className="h-6 w-6 text-blue-600" />
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
                <p className="text-sm font-medium text-emerald-600 mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.totalDurationHours ? analytics.totalDurationHours.toFixed(1) : '0.0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Conversation time</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-300">
                <Clock className="h-6 w-6 text-emerald-600" />
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
                <p className="text-sm font-medium text-purple-600 mb-1">Avg Duration</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.avgDurationMinutes ? `${analytics.avgDurationMinutes.toFixed(1)}m` : '0.0m'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per call</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
                <BarChart3 className="h-6 w-6 text-purple-600" />
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
                <p className="text-3xl font-bold text-gray-900">{analytics?.successRate || 0}%</p>
                <p className="text-xs text-gray-500 mt-1">Call completion</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors duration-300">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
        </div>

        {/* Modern Recent Calls Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Recent Call Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Monitor your latest calls and their outcomes in real-time</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 bg-green-50 border-green-200 text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live Data
                  </Badge>
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors duration-200"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors duration-200"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                </motion.button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {!analytics?.recentCalls || analytics.recentCalls.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center py-16"
              >
                <div className="relative inline-block">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <Phone className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Activity className="h-3 w-3 text-blue-600" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg font-medium text-gray-900">No recent calls</h3>
                <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
                  When you receive calls through your AI assistants, detailed analytics and insights will appear here.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Real-time call tracking active</span>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {analytics.recentCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    className="group relative bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors duration-300">
                            <Phone className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                            call.call_status === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                          }`}>
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-gray-900">
                              {call.caller_number || 'Unknown caller'}
                            </span>
                            <Badge 
                              variant={call.call_status === 'completed' ? 'default' : 'secondary'}
                              className={`text-xs px-3 py-1 rounded-full ${
                                call.call_status === 'completed' 
                                  ? 'bg-green-100 text-green-700 border-green-200' 
                                  : 'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                            >
                              {call.call_status || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-gray-400" />
                              {formatDuration(call.duration_seconds || 0)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(call.call_time).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Target className="h-4 w-4 text-gray-400" />
                              {call.assistant_display_name || 'Unknown Assistant'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {new Date(call.call_time).toLocaleTimeString()}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Zap className="h-3 w-3" />
                          AI Assistant
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modern Analytics Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8"
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Advanced Analytics & Insights</h3>
                  <p className="text-sm text-blue-800 leading-relaxed mb-4">
                    Your call analytics are automatically generated from AI assistant interactions. 
                    Real-time data includes call patterns, success metrics, duration analysis, and performance insights 
                    to help optimize your voice AI experience.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-blue-700">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Real-time updates</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span>Multi-assistant tracking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      <span>Performance insights</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/dashboard')}
                  className="inline-flex items-center px-4 py-2 bg-white border border-blue-200 rounded-xl shadow-sm text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard Overview
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/dashboard/assistants')}
                  className="inline-flex items-center px-4 py-2 bg-white border border-blue-200 rounded-xl shadow-sm text-sm font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Assistants
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push('/dashboard/settings')}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}