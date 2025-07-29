'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  X,
  Clock,
  Info
} from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'

interface UsageAlert {
  id: string
  alertType: string
  thresholdValue: number
  currentValue: number
  periodStart: string
  periodEnd: string
  isResolved: boolean
  createdAt: string
}

interface UsageAlertsProps {
  className?: string
  compact?: boolean
}

export default function UsageAlerts({ className = '', compact = false }: UsageAlertsProps) {
  const [alerts, setAlerts] = useState<UsageAlert[]>([])
  const [loading, setLoading] = useState(true)
  
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('usage_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to fetch usage alerts:', error)
        return
      }

      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching usage alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('usage_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId)

      if (error) {
        throw error
      }

      // Remove from local state
      setAlerts(alerts.filter(alert => alert.id !== alertId))
      
      toast({
        title: 'Alert Resolved',
        description: 'Usage alert has been marked as resolved',
      })
    } catch (error) {
      console.error('Failed to resolve alert:', error)
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive'
      })
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'cost_threshold':
        return <DollarSign className="h-4 w-4" />
      case 'usage_limit':
        return <TrendingUp className="h-4 w-4" />
      case 'daily_spike':
        return <Clock className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getAlertTitle = (alertType: string) => {
    switch (alertType) {
      case 'cost_threshold':
        return 'Cost Threshold Exceeded'
      case 'usage_limit':
        return 'Usage Limit Reached'
      case 'daily_spike':
        return 'Unusual Daily Activity'
      default:
        return 'Usage Alert'
    }
  }

  const getAlertDescription = (alert: UsageAlert) => {
    const formatCost = (cost: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cost)

    switch (alert.alertType) {
      case 'cost_threshold':
        return `Your spending has reached ${formatCost(alert.currentValue)}, exceeding your ${formatCost(alert.thresholdValue)} threshold.`
      case 'usage_limit':
        return `You've reached ${alert.currentValue} calls, which is ${Math.round((alert.currentValue / alert.thresholdValue) * 100)}% of your limit.`
      case 'daily_spike':
        return `Today's usage of ${formatCost(alert.currentValue)} is significantly higher than your average of ${formatCost(alert.thresholdValue)}.`
      default:
        return 'Please review your usage patterns.'
    }
  }

  const getAlertSeverity = (alert: UsageAlert) => {
    const percentageOver = (alert.currentValue - alert.thresholdValue) / alert.thresholdValue
    
    if (percentageOver >= 0.5) return 'destructive' // 50% over threshold
    if (percentageOver >= 0.2) return 'default' // 20% over threshold
    return 'default'
  }

  const getAlertBadgeText = (alert: UsageAlert) => {
    const percentageOver = ((alert.currentValue - alert.thresholdValue) / alert.thresholdValue) * 100
    if (percentageOver > 0) {
      return `+${Math.round(percentageOver)}% over`
    }
    return 'At threshold'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    if (compact) return null
    
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Usage Alerts</CardTitle>
          <CardDescription>Monitor your spending and usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">No active alerts</p>
            <p className="text-xs text-gray-500 mt-1">Your usage is within normal limits</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className={className}>
        {alerts.slice(0, 3).map((alert) => (
          <Alert key={alert.id} variant={getAlertSeverity(alert)} className="mb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getAlertIcon(alert.alertType)}
                <AlertDescription className="flex-1">
                  <span className="font-medium">{getAlertTitle(alert.alertType)}</span>
                  <br />
                  <span className="text-xs">{getAlertDescription(alert)}</span>
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResolveAlert(alert.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Usage Alerts</CardTitle>
            <CardDescription>Active notifications about your usage</CardDescription>
          </div>
          <Badge variant="outline">
            {alerts.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <Alert key={alert.id} variant={getAlertSeverity(alert)}>
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.alertType)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium">{getAlertTitle(alert.alertType)}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {getAlertBadgeText(alert)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveAlert(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <AlertDescription className="text-sm">
                  {getAlertDescription(alert)}
                </AlertDescription>
                <p className="text-xs text-gray-500 mt-2">
                  Alert created {new Date(alert.createdAt).toLocaleDateString()} at{' '}
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </Alert>
        ))}
        
        {alerts.length > 3 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm">
              View All Alerts ({alerts.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}