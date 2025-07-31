'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { 
  BarChart3, 
  TrendingUp, 
  Phone, 
  Clock, 
  DollarSign,
  Users,
  Activity,
  Target,
  CalendarDays
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

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

export default function AnalyticsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    fetchAnalytics()
  }, [user, router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/analytics/overview')
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      } else {
        setError(data.error?.message || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Analytics Unavailable</CardTitle>
              <CardDescription className="text-center">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <button 
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold tracking-tight">Analytics Overview</h1>
            <p className="text-muted-foreground">
              Performance insights across all your AI assistants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Live Data
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalCalls || 0}</div>
              <p className="text-xs text-muted-foreground">
                All-time conversations
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(analytics?.totalCost || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Voice AI expenses
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics?.avgDuration || 0)}s</div>
              <p className="text-xs text-muted-foreground">
                Per conversation
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(analytics?.successRate || 0)}%</div>
              <p className="text-xs text-muted-foreground">
                Successful interactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Performing Assistants */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Assistants</CardTitle>
              <CardDescription>
                Your most active AI assistants this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics?.topAssistants || analytics.topAssistants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assistant data available yet
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.topAssistants.map((assistant, index) => (
                    <div key={assistant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{assistant.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assistant.calls} calls • {assistant.successRate}% success
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${assistant.cost.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">cost</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest call activity across all assistants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics?.recentActivity || analytics.recentActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity to display
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div>
                          <div className="font-medium">{activity.assistantName}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.callerNumber} • {activity.duration}s
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${activity.cost.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Statistics */}
        {analytics?.dailyStats && analytics.dailyStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Daily Performance
              </CardTitle>
              <CardDescription>
                Call volume and costs over the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.dailyStats.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="font-medium min-w-[100px]">
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{day.calls} calls</span>
                        <span>{Math.round(day.avgDuration)}s avg</span>
                      </div>
                    </div>
                    <div className="font-semibold">
                      ${day.cost.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}