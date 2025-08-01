'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  Phone, 
  Clock, 
  DollarSign,
  Users,
  Activity,
  Target,
  CalendarDays,
  Zap,
  ArrowRight,
  PlayCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SimpleBarChart, SimpleLineChart } from '@/components/analytics/simple-bar-chart'

interface AnalyticsSummary {
  totalCalls: number
  totalCost: number
  totalDuration: number
  avgDuration: number
  successRate: number
  topAssistants: Array<{
    id: string
    name: string
    calls: number
    cost: number
    successRate: number
  }>
  recentActivity: Array<{
    id: string
    assistantName: string
    callerNumber: string
    duration: number
    cost: number
    success: boolean
    timestamp: string
  }>
  dailyStats: Array<{
    date: string
    calls: number
    cost: number
    avgDuration: number
  }>
}

// Error Boundary Component for individual sections
const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) => {
  try {
    return <>{children}</>
  } catch (error) {
    console.error('Analytics section error:', error)
    return <>{fallback}</>
  }
}

// Loading skeleton for metric cards
const MetricSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
)

// Empty state for new users
const EmptyAnalytics = ({ onGenerateSampleData }: { onGenerateSampleData?: () => void }) => (
  <div className="space-y-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6" 
           style={{ background: 'var(--vm-gradient-brand)' }}>
        <BarChart3 className="h-12 w-12 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-4 vm-text-primary">Welcome to Analytics</h3>
      <p className="text-lg vm-text-secondary mb-8 max-w-2xl mx-auto">
        Start making calls with your voice agents to see detailed analytics, performance metrics, and insights.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          className="px-6 py-3"
          style={{ background: 'var(--vm-gradient-brand)' }}
          onClick={() => window.location.href = '/dashboard/assistants/new'}
        >
          <Zap className="mr-2 h-5 w-5" />
          Create Your First Agent
        </Button>
        <Button 
          variant="outline" 
          className="px-6 py-3"
          style={{ borderColor: 'var(--vm-orange-primary)', color: 'var(--vm-orange-primary)' }}
          onClick={() => window.location.href = '/dashboard/assistants'}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          View Existing Agents
        </Button>
        {process.env.NODE_ENV === 'development' && onGenerateSampleData && (
          <Button 
            variant="outline" 
            className="px-6 py-3"
            style={{ borderColor: 'var(--vm-violet)', color: 'var(--vm-violet)' }}
            onClick={onGenerateSampleData}
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            Generate Sample Data
          </Button>
        )}
      </div>
    </motion.div>

    {/* Sample Charts - Always visible even with no data */}
    <div className="grid gap-6 md:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="vm-text-primary">Weekly Call Volume</CardTitle>
            <CardDescription className="vm-text-secondary">
              Your call activity will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={[
                { label: 'Mon', value: 0 },
                { label: 'Tue', value: 0 },
                { label: 'Wed', value: 0 },
                { label: 'Thu', value: 0 },
                { label: 'Fri', value: 0 },
                { label: 'Sat', value: 0 },
                { label: 'Sun', value: 0 }
              ]}
              height={200}
              showValues={false}
            />
            <p className="text-center mt-4 text-sm vm-text-muted">
              No data yet - charts will populate when you start making calls
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="vm-text-primary">Performance Metrics</CardTitle>
            <CardDescription className="vm-text-secondary">
              Success rate and quality indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={[
                { label: 'Success', value: 0, color: 'var(--vm-emerald)' },
                { label: 'Duration', value: 0, color: 'var(--vm-violet)' },
                { label: 'Cost', value: 0, color: 'var(--vm-orange-primary)' },
                { label: 'Quality', value: 0, color: 'var(--vm-gradient-brand)' }
              ]}
              height={200}
              showValues={false}
            />
            <p className="text-center mt-4 text-sm vm-text-muted">
              Metrics will be calculated from your actual call data
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  </div>
)

// Error state for API failures
const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center justify-center py-16"
  >
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
             style={{ background: 'var(--vm-orange-pale)' }}>
          <AlertCircle className="h-8 w-8" style={{ color: 'var(--vm-orange-primary)' }} />
        </div>
        <CardTitle className="vm-text-primary">Analytics Temporarily Unavailable</CardTitle>
        <CardDescription className="vm-text-secondary">
          We're having trouble loading your analytics data. This usually resolves quickly.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          onClick={onRetry}
          className="px-6 py-2"
          style={{ background: 'var(--vm-gradient-brand)' }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  </motion.div>
)

// Individual metric card with error handling
const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: {
  title: string
  value: string | number
  subtitle: string
  icon: any
  trend?: { value: number, isPositive: boolean }
}) => (
  <ErrorBoundary fallback={<MetricSkeleton />}>
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium vm-text-secondary">{title}</CardTitle>
          <Icon className="h-4 w-4 vm-text-muted" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold vm-text-primary">{value}</div>
          <div className="flex items-center gap-2">
            <p className="text-xs vm-text-muted">{subtitle}</p>
            {trend && (
              <Badge 
                variant={trend.isPositive ? "default" : "secondary"}
                className={`text-xs ${trend.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
              >
                {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1 rotate-180" />}
                {Math.abs(trend.value)}%
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </ErrorBoundary>
)

export default function AnalyticsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [generatingData, setGeneratingData] = useState(false)

  // Always allow access to analytics page
  useEffect(() => {
    // Don't redirect if no user - just show limited analytics
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // If no user, show empty state immediately
      if (!user) {
        setAnalytics(null)
        setHasData(false)
        setLoading(false)
        return
      }
      
      const response = await fetch('/api/analytics/overview')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
        // Check if user has any meaningful data
        setHasData(data.data.totalCalls > 0 || data.data.topAssistants.length > 0)
      } else {
        throw new Error(data.error?.message || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      // Still show the page, just with error state for that section
    } finally {
      setLoading(false)
    }
  }

  const generateSampleData = async () => {
    if (!user || generatingData) return
    
    try {
      setGeneratingData(true)
      const response = await fetch('/api/analytics/generate-sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh analytics after generating data
        fetchAnalytics()
      } else {
        console.error('Failed to generate sample data:', data.error)
      }
    } catch (err) {
      console.error('Generate sample data error:', err)
    } finally {
      setGeneratingData(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight vm-text-gradient">Analytics</h1>
            <p className="text-lg vm-text-secondary mt-2">
              {!user ? 'Sign in to view your voice agent analytics' :
               hasData ? 'Performance insights across all your voice agents' :
               'Deploy your first voice agent to start tracking analytics'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/dashboard/analytics/assistant')}
              variant="outline"
              size="sm"
              disabled={!user}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Assistant Analytics
            </Button>
            <Badge 
              variant="outline" 
              className="flex items-center gap-1"
              style={{ borderColor: 'var(--vm-orange-primary)', color: 'var(--vm-orange-primary)' }}
            >
              <Activity className="h-3 w-3" />
              {user ? 'Live Data' : 'Demo Mode'}
            </Badge>
          </div>
        </motion.div>

        {/* Content based on state */}
        {loading ? (
          // Loading State
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : !user || !hasData ? (
          // Empty State for new users or users without data
          <EmptyAnalytics onGenerateSampleData={generateSampleData} />
        ) : error ? (
          // Error State - still shows page structure
          <div className="space-y-8">
            {/* Show basic metrics with placeholder data */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total Calls" value="--" subtitle="Temporarily unavailable" icon={Phone} />
              <MetricCard title="Total Cost" value="--" subtitle="Temporarily unavailable" icon={DollarSign} />
              <MetricCard title="Avg Duration" value="--" subtitle="Temporarily unavailable" icon={Clock} />
              <MetricCard title="Success Rate" value="--" subtitle="Temporarily unavailable" icon={Target} />
            </div>
            
            {/* Error state for detailed sections */}
            <ErrorState onRetry={fetchAnalytics} />
          </div>
        ) : (
          // Full Analytics Dashboard
          <div className="space-y-8">
            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              <MetricCard 
                title="Total Calls" 
                value={analytics?.totalCalls || 0}
                subtitle="All-time conversations" 
                icon={Phone}
              />
              <MetricCard 
                title="Total Cost" 
                value={`$${(analytics?.totalCost || 0).toFixed(2)}`}
                subtitle="Voice AI expenses" 
                icon={DollarSign}
              />
              <MetricCard 
                title="Avg Duration" 
                value={`${Math.round(analytics?.avgDuration || 0)}s`}
                subtitle="Per conversation" 
                icon={Clock}
              />
              <MetricCard 
                title="Success Rate" 
                value={`${Math.round(analytics?.successRate || 0)}%`}
                subtitle="Successful interactions" 
                icon={Target}
              />
            </motion.div>

            {/* Charts and Details */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Performing Agents */}
              <ErrorBoundary fallback={
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Agents</CardTitle>
                    <CardDescription>Data temporarily unavailable</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 vm-text-muted">
                      Unable to load agent performance data
                    </div>
                  </CardContent>
                </Card>
              }>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="vm-text-primary">Top Performing Agents</CardTitle>
                      <CardDescription className="vm-text-secondary">
                        Your most active voice agents this month
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!analytics?.topAssistants || analytics.topAssistants.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-4 vm-text-muted" />
                          <p className="vm-text-muted">No agent data available yet</p>
                          <p className="text-sm vm-text-muted mt-1">Deploy agents and make calls to see performance metrics</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {analytics.topAssistants.map((assistant, index) => (
                            <motion.div
                              key={assistant.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ background: 'var(--vm-surface)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full"
                                     style={{ background: 'var(--vm-gradient-brand)' }}>
                                  <span className="text-sm font-semibold text-white">#{index + 1}</span>
                                </div>
                                <div>
                                  <div className="font-medium vm-text-primary">{assistant.name}</div>
                                  <div className="text-sm vm-text-secondary">
                                    {assistant.calls} calls • {assistant.successRate}% success
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold vm-text-primary">${assistant.cost.toFixed(2)}</div>
                                <div className="text-sm vm-text-muted">cost</div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </ErrorBoundary>

              {/* Recent Activity */}
              <ErrorBoundary fallback={
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Data temporarily unavailable</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 vm-text-muted">
                      Unable to load activity data
                    </div>
                  </CardContent>
                </Card>
              }>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="vm-text-primary">Recent Activity</CardTitle>
                      <CardDescription className="vm-text-secondary">
                        Latest call activity across all agents
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
                        <div className="text-center py-8">
                          <Activity className="h-12 w-12 mx-auto mb-4 vm-text-muted" />
                          <p className="vm-text-muted">No recent activity to display</p>
                          <p className="text-sm vm-text-muted mt-1">Your recent calls will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {analytics.recentActivity.map((activity, index) => (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index }}
                              className="flex items-center justify-between p-3 border rounded-lg"
                              style={{ borderColor: 'var(--vm-border-subtle)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <div>
                                  <div className="font-medium vm-text-primary">{activity.assistantName}</div>
                                  <div className="text-sm vm-text-secondary">
                                    {activity.callerNumber} • {activity.duration}s
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold vm-text-primary">${activity.cost.toFixed(2)}</div>
                                <div className="text-xs vm-text-muted">
                                  {new Date(activity.timestamp).toLocaleDateString()}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </ErrorBoundary>
            </div>

            {/* Daily Statistics with Charts */}
            <ErrorBoundary fallback={null}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 vm-text-primary">
                      <CalendarDays className="h-5 w-5" />
                      Daily Performance
                    </CardTitle>
                    <CardDescription className="vm-text-secondary">
                      Call volume and costs over the past week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Call Volume Chart */}
                    <div>
                      <h4 className="text-sm font-medium vm-text-primary mb-3">Call Volume</h4>
                      <SimpleBarChart
                        data={analytics?.dailyStats?.map(day => ({
                          label: new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
                          value: day.calls
                        })) || [
                          { label: 'Mon', value: 0 },
                          { label: 'Tue', value: 0 },
                          { label: 'Wed', value: 0 },
                          { label: 'Thu', value: 0 },
                          { label: 'Fri', value: 0 },
                          { label: 'Sat', value: 0 },
                          { label: 'Sun', value: 0 }
                        ]}
                        height={150}
                      />
                    </div>
                    
                    {/* Cost Trend Chart */}
                    <div>
                      <h4 className="text-sm font-medium vm-text-primary mb-3">Cost Trend</h4>
                      <SimpleLineChart
                        data={analytics?.dailyStats?.map(day => ({
                          date: new Date(day.date).toLocaleDateString(),
                          value: day.cost
                        })) || []}
                        height={150}
                      />
                    </div>
                    
                    {/* Detailed Stats */}
                    {analytics?.dailyStats && analytics.dailyStats.length > 0 && (
                      <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--vm-border-subtle)' }}>
                        <h4 className="text-sm font-medium vm-text-primary mb-3">Detailed Breakdown</h4>
                        {analytics.dailyStats.map((day, index) => (
                          <motion.div
                            key={day.date}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            style={{ borderColor: 'var(--vm-border-subtle)' }}
                          >
                            <div className="flex items-center gap-4">
                              <div className="font-medium min-w-[100px] vm-text-primary">
                                {new Date(day.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-4 text-sm vm-text-secondary">
                                <span>{day.calls} calls</span>
                                <span>{Math.round(day.avgDuration)}s avg</span>
                              </div>
                            </div>
                            <div className="font-semibold vm-text-primary">
                              ${day.cost.toFixed(2)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </ErrorBoundary>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}