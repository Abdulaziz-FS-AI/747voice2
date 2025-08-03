'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  Users,
  Timer,
  CheckCircle
} from 'lucide-react'
import { useUsage } from '@/contexts/subscription-context'

interface UsageIndicatorProps {
  className?: string
  variant?: 'compact' | 'detailed'
  showRefresh?: boolean
}

export default function UsageIndicator({ 
  className = '', 
  variant = 'detailed',
  showRefresh = true 
}: UsageIndicatorProps) {
  const { usage, loading, error, refreshUsage } = useUsage()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshUsage()
    setRefreshing(false)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 80) return 'text-orange-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Loading usage data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !usage) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load usage data</p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </CardContent>
      </Card>
    )
  }

  const minutesPercentage = (usage.minutes.used / usage.minutes.limit) * 100
  const assistantsPercentage = (usage.assistants.count / usage.assistants.limit) * 100

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Timer className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{usage.minutes.used}/{usage.minutes.limit} min</p>
                <p className="text-xs text-gray-500">This month</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{usage.assistants.count}/{usage.assistants.limit}</p>
              <p className="text-xs text-gray-500">assistants</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Usage Limits</CardTitle>
            <CardDescription>
              Monthly usage • Resets in {usage.minutes.daysUntilReset} days
            </CardDescription>
          </div>
          {showRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh usage data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Minutes Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Call Minutes</h3>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${getUsageColor(minutesPercentage)}`}>
                {usage.minutes.used}/{usage.minutes.limit}
              </p>
              <p className="text-xs text-gray-500">
                {minutesPercentage.toFixed(0)}% used
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={minutesPercentage} 
              className="h-2"
            />
            {minutesPercentage >= 80 && (
              <div className="flex items-center space-x-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span className="text-orange-600">
                  {minutesPercentage >= 90 ? 'Critical: ' : 'Warning: '}
                  You've used {minutesPercentage.toFixed(0)}% of your monthly minutes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Assistants Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">AI Assistants</h3>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${getUsageColor(assistantsPercentage)}`}>
                {usage.assistants.count}/{usage.assistants.limit}
              </p>
              <p className="text-xs text-gray-500">
                {assistantsPercentage.toFixed(0)}% used
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={assistantsPercentage} 
              className="h-2"
            />
            {assistantsPercentage >= 80 && (
              <div className="flex items-center space-x-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
                <span className="text-orange-600">
                  {assistantsPercentage >= 100 ? 'You\'ve reached your assistant limit' : 
                   `You're using ${usage.assistants.count} of ${usage.assistants.limit} assistants`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Call Statistics */}
        {usage.calls.totalThisMonth > 0 && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-medium text-gray-900">This Month's Activity</h4>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{usage.calls.totalThisMonth}</p>
                <p className="text-xs text-gray-500">total calls</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{usage.calls.successRate}%</p>
                <p className="text-xs text-gray-500">success rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(usage.calls.averageDuration)}</p>
                <p className="text-xs text-gray-500">avg duration</p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center space-x-2">
            {minutesPercentage < 80 && assistantsPercentage < 80 ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Usage within normal limits</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600">Approaching usage limits</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}