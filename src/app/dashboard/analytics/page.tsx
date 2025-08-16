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
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricsCard } from '@/components/ui/metrics-card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { authenticatedFetch, handleAuthenticatedResponse } from '@/lib/utils/client-session'
import type { DashboardAnalytics, CallLog, ClientAssistant } from '@/types/client'

interface AnalyticsStats {
  totalCalls: number
  totalDurationHours: number
  avgDurationMinutes: number
  successRate: number
  recentCalls: CallLog[]
}

interface AssistantComparison {
  id: string
  display_name: string
  vapi_assistant_id: string
  total_calls: number
  success_rate: number
  avg_duration: number
  total_cost: number
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { client, isAuthenticated, isLoading } = usePinAuth()
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null)
  const [assistantComparison, setAssistantComparison] = useState<AssistantComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30') // days

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchAnalytics()
      fetchAssistantComparison()
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

  const fetchAssistantComparison = async () => {
    try {
      // First get all assistants
      const assistantsResponse = await authenticatedFetch('/api/assistants')
      const assistantsResult = await handleAuthenticatedResponse<{data: ClientAssistant[]}>(assistantsResponse)
      
      if (assistantsResult && assistantsResult.data) {
        const assistants = Array.isArray(assistantsResult.data) ? assistantsResult.data : []
        
        // Get analytics for each assistant and combine
        const comparisonData: AssistantComparison[] = []
        
        for (const assistant of assistants) {
          try {
            const response = await authenticatedFetch(`/api/analytics/assistant/${assistant.id}`)
            const data = await handleAuthenticatedResponse<any>(response)
            
            if (data && data.metrics) {
              comparisonData.push({
                id: assistant.id,
                display_name: assistant.display_name,
                vapi_assistant_id: assistant.vapi_assistant_id,
                total_calls: data.metrics.totalCalls || 0,
                success_rate: data.metrics.successRate || 0,
                avg_duration: data.metrics.avgDuration || 0,
                total_cost: data.metrics.totalCost || 0
              })
            }
          } catch (error) {
            console.warn(`Failed to fetch analytics for assistant ${assistant.id}:`, error)
          }
        }
        
        setAssistantComparison(comparisonData)
      }
    } catch (error) {
      console.error('[Analytics] Failed to fetch assistant comparison:', error)
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
        <div className="app-main">
          <motion.div 
            className="flex items-center justify-center min-h-[60vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center gap-6">
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
                  <BarChart3 className="w-6 h-6 text-vm-primary vm-animate-pulse-slow" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <motion.h3 
                  className="vm-text-lg font-semibold vm-text-bright"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Loading Analytics
                </motion.h3>
                <p className="vm-text-small vm-subheading-contrast">
                  Fetching your performance data...
                </p>
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
          {/* Premium Header */}
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
                Analytics Dashboard
              </motion.h1>
              <motion.p 
                className="vm-text-lead vm-text-bright max-w-2xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                Monitor your AI assistant performance and track call analytics in real-time
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center gap-4"
            >
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-48 bg-vm-surface-elevated border-vm-border vm-text-bright">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent className="bg-vm-surface-elevated border-vm-border">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push('/dashboard/analytics/assistant')}
                leftIcon={<BarChart3 className="h-5 w-5" />}
                asMotion
                motionProps={{
                  whileHover: { scale: 1.02, y: -2 },
                  whileTap: { scale: 0.98 },
                }}
                className="vm-hover-glow"
              >
                Assistant Analytics
              </Button>
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
              <MetricsCard
                variant="success"
                icon={<Phone className="h-5 w-5" />}
                label="Total Calls"
                value={analytics?.totalCalls || 0}
                description={`Last ${timeRange} days`}
                valueEmphasis="primary"
                asMotion
                glow
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <MetricsCard
                variant="default"
                icon={<Clock className="h-5 w-5" />}
                label="Total Hours"
                value={analytics?.totalDurationHours ? analytics.totalDurationHours.toFixed(1) : '0.0'}
                description="Conversation time"
                valueEmphasis="gradient"
                asMotion
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <MetricsCard
                variant="warning"
                icon={<BarChart3 className="h-5 w-5" />}
                label="Avg Duration"
                value={analytics?.avgDurationMinutes ? `${analytics.avgDurationMinutes.toFixed(1)}m` : '0.0m'}
                description="Per call"
                valueEmphasis="premium"
                asMotion
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <MetricsCard
                variant="premium"
                icon={<TrendingUp className="h-5 w-5" />}
                label="Success Rate"
                value={`${analytics?.successRate || 0}%`}
                description="Call completion"
                valueEmphasis="gradient"
                asMotion
                glow
              />
            </motion.div>
          </motion.div>

          {/* Premium Recent Calls Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="vm-card relative overflow-hidden"
          >
            <div className="p-8 border-b border-vm-glass-border/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <motion.h2 
                    className="vm-display-small vm-heading-contrast"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0, duration: 0.6 }}
                  >
                    Recent Call Activity
                  </motion.h2>
                  <motion.p 
                    className="vm-text-body vm-subheading-contrast"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                  >
                    Monitor your latest assistant interactions and performance
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                >
                  <Badge variant="outline" className="flex items-center gap-1 text-vm-success border-vm-success">
                    <Activity className="h-3 w-3" />
                    Live Data
                  </Badge>
                </motion.div>
              </div>
            </div>

            <div className="p-8">
              {!analytics?.recentCalls || analytics.recentCalls.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3, duration: 0.6 }}
                  className="text-center py-16"
                >
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-vm-primary/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
                    <div className="relative w-24 h-24 mx-auto rounded-full bg-vm-gradient-glass border border-vm-glass-border backdrop-blur-lg flex items-center justify-center">
                      <Phone className="h-8 w-8 text-vm-primary" />
                    </div>
                  </div>
                  <h3 className="vm-text-lg font-semibold vm-text-bright mb-2">No recent calls</h3>
                  <p className="vm-text-body vm-subheading-contrast mb-4 max-w-md mx-auto">
                    When you receive calls through your AI assistants, they'll appear here with detailed analytics.
                  </p>
                  <p className="vm-text-small vm-text-muted">
                    Call analytics are updated in real-time.
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {analytics.recentCalls.map((call, index) => (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-center justify-between p-6 vm-card border border-vm-glass-border/50 hover:border-vm-ring vm-hover-lift"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-vm-primary/10 border border-vm-primary/20 rounded-xl">
                          <Phone className="h-5 w-5 text-vm-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium vm-text-bright">
                              {call.caller_number || 'Unknown caller'}
                            </span>
                            <Badge 
                              variant={call.call_status === 'completed' ? 'default' : 'secondary'}
                              className={`text-xs ${
                                call.call_status === 'completed' 
                                  ? 'text-vm-success border-vm-success' 
                                  : 'text-vm-muted border-vm-border'
                              }`}
                            >
                              {call.call_status || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="text-sm vm-text-muted flex items-center gap-4">
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
                        <div className="text-sm font-medium vm-text-bright">
                          Assistant: {call.assistant_display_name || 'Unknown'}
                        </div>
                        <div className="text-xs vm-text-muted">
                          {new Date(call.call_time).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Assistant Performance Comparison */}
          {assistantComparison.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3, duration: 0.6 }}
              className="vm-card relative overflow-hidden"
            >
              <div className="p-8 border-b border-vm-glass-border/50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-2">
                    <motion.h2 
                      className="vm-display-small vm-heading-contrast"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4, duration: 0.6 }}
                    >
                      Assistant Performance Comparison
                    </motion.h2>
                    <motion.p 
                      className="vm-text-body vm-subheading-contrast"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.5, duration: 0.6 }}
                    >
                      Compare performance metrics across all your AI assistants
                    </motion.p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {assistantComparison.map((assistant, index) => (
                    <motion.div
                      key={assistant.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6 + index * 0.1 }}
                      className="p-6 vm-card border border-vm-glass-border/50 hover:border-vm-ring vm-hover-lift cursor-pointer"
                      onClick={() => router.push(`/dashboard/analytics/assistant?assistant=${assistant.id}`)}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-vm-primary/10 border border-vm-primary/20 rounded-lg">
                          <BarChart3 className="h-5 w-5 text-vm-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold vm-text-bright">{assistant.display_name}</h3>
                          <p className="text-xs vm-text-muted">VAPI ID: {assistant.vapi_assistant_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm vm-text-secondary">Total Calls</span>
                          <Badge variant="outline" className="text-vm-primary border-vm-primary">
                            {assistant.total_calls}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm vm-text-secondary">Success Rate</span>
                          <Badge variant="outline" className="text-vm-success border-vm-success">
                            {assistant.success_rate}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm vm-text-secondary">Avg Duration</span>
                          <Badge variant="outline" className="text-vm-accent border-vm-accent">
                            {assistant.avg_duration}s
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm vm-text-secondary">Total Cost</span>
                          <Badge variant="outline" className="text-vm-warning border-vm-warning">
                            ${assistant.total_cost.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Premium Analytics Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.6 }}
          >
            <Card className="vm-card border border-vm-accent/30 bg-vm-gradient-glass backdrop-blur-lg">
              <CardContent className="p-8">
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-vm-accent/10 border border-vm-accent/20 rounded-xl flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-vm-accent" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="vm-text-lg font-semibold text-vm-accent">Analytics & Reporting</h3>
                    <p className="vm-text-body vm-text-bright leading-relaxed">
                      Your call analytics are automatically generated from your voice assistant interactions. 
                      Data is updated in real-time and includes call duration, success rates, and caller information.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push('/dashboard')}
                        asMotion
                        motionProps={{
                          whileHover: { scale: 1.02 },
                          whileTap: { scale: 0.98 },
                        }}
                      >
                        Back to Dashboard
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/assistants')}
                        asMotion
                        motionProps={{
                          whileHover: { scale: 1.02 },
                          whileTap: { scale: 0.98 },
                        }}
                      >
                        View Assistants
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}