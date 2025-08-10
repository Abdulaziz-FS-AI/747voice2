'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  AlertTriangle,
  Users,
  Timer,
  CheckCircle
} from 'lucide-react'
// Subscription context removed - demo system uses DemoStatusCard instead

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
  // Demo system: Usage tracking is handled by DemoStatusCard component
  // This component is kept for compatibility but shows demo message
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Demo Usage</CardTitle>
            <CardDescription>
              Usage tracking available in demo status panel
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Timer className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">Demo Account</p>
          <p className="text-xs text-gray-500 mt-1">
            Check the Demo Status card for detailed usage information
          </p>
        </div>
      </CardContent>
    </Card>
  )
}