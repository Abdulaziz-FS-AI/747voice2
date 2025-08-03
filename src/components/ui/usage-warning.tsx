'use client'

import { useEffect, useState } from 'react'
import { UsageLimitService } from '@/lib/services/usage-limit.service'

interface UsageWarningProps {
  userId: string
}

export function UsageWarning({ userId }: UsageWarningProps) {
  const [usage, setUsage] = useState<{
    totalMinutes: number
    warningLevel: 'none' | 'approaching' | 'critical' | 'exceeded'
  } | null>(null)
  
  useEffect(() => {
    // Load usage data
    UsageLimitService.calculateUserUsage(userId)
      .then(data => {
        let warningLevel: 'none' | 'approaching' | 'critical' | 'exceeded' = 'none'
        
        if (data.totalMinutes >= 10) {
          warningLevel = 'exceeded'
        } else if (data.totalMinutes >= 9) {
          warningLevel = 'critical'
        } else if (data.totalMinutes >= 8) {
          warningLevel = 'approaching'
        }
        
        setUsage({
          totalMinutes: data.totalMinutes,
          warningLevel
        })
      })
      .catch(error => {
        console.error('Failed to load usage:', error)
      })
  }, [userId])
  
  // Don't show if no warning needed
  if (!usage || usage.warningLevel === 'none') {
    return null
  }
  
  const minutesRemaining = Math.max(0, 10 - usage.totalMinutes)
  
  const getWarningStyles = () => {
    switch (usage.warningLevel) {
      case 'approaching':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'critical':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'exceeded':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return ''
    }
  }
  
  const getWarningMessage = () => {
    switch (usage.warningLevel) {
      case 'approaching':
        return `You've used ${usage.totalMinutes} minutes this month. ${minutesRemaining} minutes remaining.`
      case 'critical':
        return `⚠️ Only ${minutesRemaining} minute remaining! Calls will be limited to 10 seconds after this.`
      case 'exceeded':
        return `🚫 Monthly limit of 10 minutes reached. All calls are now limited to 10 seconds.`
      default:
        return ''
    }
  }
  
  return (
    <div className={`p-4 rounded-lg border ${getWarningStyles()}`}>
      <p className="font-medium">{getWarningMessage()}</p>
      <p className="text-sm mt-1 opacity-75">
        Your usage resets on the monthly anniversary of your signup date.
      </p>
    </div>
  )
}