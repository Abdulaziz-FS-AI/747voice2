'use client'

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
  AlertCircle
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">View your call analytics and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Calls</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalCalls || 0}</p>
                <p className="text-xs text-gray-500">Last {timeRange} days</p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.totalDurationHours ? analytics.totalDurationHours.toFixed(1) : '0.0'}
                </p>
                <p className="text-xs text-gray-500">Conversation time</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.avgDurationMinutes ? `${analytics.avgDurationMinutes.toFixed(1)}m` : '0.0m'}
                </p>
                <p className="text-xs text-gray-500">Per call</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
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
                <p className="text-2xl font-bold text-gray-900">{analytics?.successRate || 0}%</p>
                <p className="text-xs text-gray-500">Call completion</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Recent Call Activity</h2>
                <p className="text-sm text-gray-600">Your latest calls and their outcomes</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Live Data
              </Badge>
            </div>
          </div>

          <div className="p-6">
            {!analytics?.recentCalls || analytics.recentCalls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent calls</h3>
                <p className="mt-1 text-sm text-gray-500">
                  When you receive calls through your assistants, they'll appear here.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Call analytics are updated in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.recentCalls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <Phone className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {call.caller_number || 'Unknown caller'}
                          </span>
                          <Badge 
                            variant={call.call_status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {call.call_status || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(call.duration_seconds || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(call.call_time).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Assistant: {call.assistant_display_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(call.call_time).toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Analytics Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Analytics & Reporting</p>
              <p className="mt-1">
                Your call analytics are automatically generated from your voice assistant interactions. 
                Data is updated in real-time and includes call duration, success rates, and caller information.
              </p>
              <div className="mt-3 flex gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/assistants')}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  View Assistants
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}