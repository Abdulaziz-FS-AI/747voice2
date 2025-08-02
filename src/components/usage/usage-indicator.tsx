'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Phone, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  TrendingUp,
  Mic,
  MessageSquare,
  Zap
} from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface UsageData {
  totalCalls: number
  totalDuration: number
  totalCost: number
  aiModelCost: number
  transcriptionCost: number
  ttsCost: number
  phoneCost: number
  periodStart: string
  callsThisMonth: number
  costThisMonth: number
  averageCallCost: number
  averageCallDuration: number
}

interface UsageIndicatorProps {
  className?: string
  variant?: 'compact' | 'detailed'
  showSync?: boolean
}

export default function UsageIndicator({ 
  className = '', 
  variant = 'detailed',
  showSync = true 
}: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchUsageData()
    fetchSyncStatus()
  }, [])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      
      // Get current usage from database function
      const { data, error } = await supabase.rpc('get_team_current_usage')
      
      if (error) {
        console.error('Failed to fetch usage data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load usage data',
          variant: 'destructive'
        })
        return
      }

      // Get additional metrics
      const { data: dailyStats } = await supabase
        .from('daily_usage')
        .select('*')
        .gte('usage_date', getMonthStart())
        .order('usage_date', { ascending: false })

      const monthlyStats = dailyStats?.reduce((acc, day) => ({
        calls: acc.calls + (day.calls_count || 0),
        cost: acc.cost + (day.total_cost || 0),
        duration: acc.duration + (day.total_duration || 0)
      }), { calls: 0, cost: 0, duration: 0 }) || { calls: 0, cost: 0, duration: 0 }

      setUsage({
        totalCalls: data?.[0]?.total_calls || 0,
        totalDuration: data?.[0]?.total_duration || 0,
        totalCost: data?.[0]?.total_cost || 0,
        aiModelCost: data?.[0]?.ai_model_cost || 0,
        transcriptionCost: data?.[0]?.transcription_cost || 0,
        ttsCost: data?.[0]?.tts_cost || 0,
        phoneCost: data?.[0]?.phone_cost || 0,
        periodStart: data?.[0]?.period_start || new Date().toISOString(),
        callsThisMonth: monthlyStats.calls,
        costThisMonth: monthlyStats.cost,
        averageCallCost: data?.[0]?.total_calls > 0 ? (data[0].total_cost / data[0].total_calls) : 0,
        averageCallDuration: data?.[0]?.total_calls > 0 ? (data[0].total_duration / data[0].total_calls) : 0,
      })
    } catch (error) {
      console.error('Error fetching usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/usage/sync')
      const result = await response.json()
      
      if (result.success) {
        setLastSyncAt(result.data.lastSyncAt)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      
      const response = await fetch('/api/usage/sync', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Usage Synced',
          description: `Synced ${result.data.syncedCalls} calls with $${result.data.totalCostSynced} in cost updates`,
        })
        
        // Refresh data
        await fetchUsageData()
        setLastSyncAt(result.data.syncedAt)
      } else {
        throw new Error(result.error?.message || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync usage data from voice service',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getMonthStart = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(cost)
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  const getTimeSinceLastSync = () => {
    if (!lastSyncAt) return 'Never'
    
    const now = new Date()
    const syncTime = new Date(lastSyncAt)
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
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

  if (!usage) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load usage data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatCost(usage.totalCost)}</p>
                <p className="text-xs text-gray-500">Current period</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{usage.totalCalls}</p>
              <p className="text-xs text-gray-500">calls</p>
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
            <CardTitle className="text-lg">Usage & Costs</CardTitle>
            <CardDescription>
              Current billing period • Started {new Date(usage.periodStart).toLocaleDateString()}
            </CardDescription>
          </div>
          {showSync && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                title={`Sync with Voice Service - Last sync: ${getTimeSinceLastSync()}`}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Cost Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900">Total Spend</h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Period to Date
            </Badge>
          </div>
          <div className="text-3xl font-bold text-blue-900 mb-1">
            {formatCost(usage.totalCost)}
          </div>
          <div className="flex items-center space-x-4 text-sm text-blue-700">
            <div className="flex items-center space-x-1">
              <Phone className="h-3 w-3" />
              <span>{usage.totalCalls} calls</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(usage.totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-sm">AI Model</span>
              </div>
              <span className="text-sm font-medium">{formatCost(usage.aiModelCost)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mic className="h-4 w-4 text-green-500" />
                <span className="text-sm">Transcription</span>
              </div>
              <span className="text-sm font-medium">{formatCost(usage.transcriptionCost)}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Text-to-Speech</span>
              </div>
              <span className="text-sm font-medium">{formatCost(usage.ttsCost)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Phone/Transport</span>
              </div>
              <span className="text-sm font-medium">{formatCost(usage.phoneCost)}</span>
            </div>
          </div>
        </div>

        {/* Averages */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Averages</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCost(usage.averageCallCost)}</p>
              <p className="text-xs text-gray-500">per call</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(Math.round(usage.averageCallDuration))}</p>
              <p className="text-xs text-gray-500">avg duration</p>
            </div>
          </div>
        </div>

        {/* Month Comparison */}
        {usage.costThisMonth > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">This Month</h4>
              <div className="flex items-center space-x-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs">Tracking</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>{formatCost(usage.costThisMonth)} • {usage.callsThisMonth} calls</span>
              <Badge variant="outline" className="text-xs">
                Month to Date
              </Badge>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {showSync && lastSyncAt && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Last synced with voice service: {getTimeSinceLastSync()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}