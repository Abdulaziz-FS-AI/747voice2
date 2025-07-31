'use client'

import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'

interface CostTrackerProps {
  userId?: string
}

export function CostTracker({ userId }: CostTrackerProps) {
  const [totalSpent, setTotalSpent] = useState(0)
  const [remainingBudget, setRemainingBudget] = useState(10.00)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    
    fetchUserCosts()
  }, [userId])

  const fetchUserCosts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/costs?user_id=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        const spent = data.data.totalCost || 0
        setTotalSpent(spent)
        setRemainingBudget(data.data.remainingBudget || Math.max(0, 10.00 - spent))
      }
    } catch (error) {
      console.error('Failed to fetch user costs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProgressColor = () => {
    const percentage = (totalSpent / 10.00) * 100
    if (percentage < 50) return 'var(--vm-success)'
    if (percentage < 80) return 'var(--vm-warning)'
    return 'var(--vm-error)'
  }

  const getProgressPercentage = () => {
    return Math.min((totalSpent / 10.00) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" 
           style={{ background: 'var(--vm-surface)' }}>
        <DollarSign className="h-4 w-4" style={{ color: 'var(--vm-primary)' }} />
        <span className="text-sm font-medium vm-text-muted">Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg" 
         style={{ background: 'var(--vm-surface)', border: '1px solid var(--vm-border)' }}>
      <DollarSign className="h-4 w-4" style={{ color: getProgressColor() }} />
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--vm-text-primary)' }}>
            ${remainingBudget.toFixed(2)} left
          </span>
          <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--vm-border)' }}>
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${getProgressPercentage()}%`,
                background: getProgressColor()
              }}
            />
          </div>
        </div>
        <span className="text-xs vm-text-muted">
          ${totalSpent.toFixed(2)} spent
        </span>
      </div>
    </div>
  )
}