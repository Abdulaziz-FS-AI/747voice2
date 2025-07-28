import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  loading?: boolean
  description?: string
  trend?: {
    value: number
    label: string
    positive: boolean
  }
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  loading = false,
  description,
  trend 
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            {description && <Skeleton className="h-4 w-32" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">
              {value.toLocaleString()}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {trend && (
              <p className="text-xs text-muted-foreground">
                <span className={trend.positive ? 'text-green-600' : 'text-red-600'}>
                  {trend.positive ? '+' : ''}{trend.value}%
                </span>{' '}
                {trend.label}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}