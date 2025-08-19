"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  EyeOff
} from "lucide-react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"

/**
 * Modern Metric Card variants
 * Professional analytics cards for SaaS dashboards
 */
const metricCardVariants = cva(
  [
    "relative group transition-all duration-300 ease-out",
    "hover:shadow-lg hover:-translate-y-1",
  ],
  {
    variants: {
      variant: {
        default: "",
        accent: "border-l-4 border-l-[var(--vm-color-primary)]",
        success: "border-l-4 border-l-[var(--vm-color-success)]",
        warning: "border-l-4 border-l-[var(--vm-color-warning)]",
        error: "border-l-4 border-l-[var(--vm-color-error)]",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      trend: {
        up: "bg-gradient-to-br from-green-50/30 to-transparent dark:from-green-900/20",
        down: "bg-gradient-to-br from-red-50/30 to-transparent dark:from-red-900/20", 
        neutral: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      trend: "neutral",
    },
  }
)

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  title: string
  value: string | number
  previousValue?: string | number
  change?: number | string
  changeType?: "percentage" | "absolute" | "custom"
  trend?: "up" | "down" | "neutral"
  icon?: React.ReactNode
  subtitle?: string
  loading?: boolean
  precision?: number
  prefix?: string
  suffix?: string
  showTrend?: boolean
  showChange?: boolean
  showOptions?: boolean
  onOptionClick?: () => void
  sparklineData?: number[]
  target?: number
  status?: "default" | "success" | "warning" | "error"
}

/**
 * Format number with appropriate precision and separators
 */
function formatNumber(
  value: number | string, 
  precision: number = 0,
  prefix: string = "",
  suffix: string = ""
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value
  
  if (isNaN(numValue)) return String(value)

  // Handle large numbers
  let formatted: string
  if (numValue >= 1_000_000) {
    formatted = (numValue / 1_000_000).toFixed(precision) + "M"
  } else if (numValue >= 1_000) {
    formatted = (numValue / 1_000).toFixed(precision) + "K"
  } else {
    formatted = numValue.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
  }

  return `${prefix}${formatted}${suffix}`
}

/**
 * Calculate change between current and previous values
 */
function calculateChange(current: number | string, previous: number | string): {
  change: number
  changePercentage: number
  trend: "up" | "down" | "neutral"
} {
  const currentNum = typeof current === "string" ? parseFloat(current) : current
  const previousNum = typeof previous === "string" ? parseFloat(previous) : previous

  if (isNaN(currentNum) || isNaN(previousNum) || previousNum === 0) {
    return { change: 0, changePercentage: 0, trend: "neutral" }
  }

  const change = currentNum - previousNum
  const changePercentage = (change / Math.abs(previousNum)) * 100

  let trend: "up" | "down" | "neutral"
  if (Math.abs(changePercentage) < 0.1) {
    trend = "neutral"
  } else if (changePercentage > 0) {
    trend = "up"
  } else {
    trend = "down"
  }

  return { change, changePercentage, trend }
}

/**
 * Simple sparkline component
 */
const Sparkline = ({ data, className }: { data: number[], className?: string }) => {
  if (!data || data.length < 2) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = ((max - value) / range) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg className={cn("w-16 h-8", className)} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-60"
      />
      <circle
        cx={data.length > 1 ? ((data.length - 1) / (data.length - 1)) * 100 : 0}
        cy={data.length > 1 ? ((max - data[data.length - 1]) / range) * 100 : 50}
        r="2"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Main Metric Card component
 */
const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({
    className,
    variant = "default",
    size = "md",
    trend: trendProp,
    title,
    value,
    previousValue,
    change,
    changeType = "percentage",
    icon,
    subtitle,
    loading = false,
    precision = 0,
    prefix = "",
    suffix = "",
    showTrend = true,
    showChange = true,
    showOptions = false,
    onOptionClick,
    sparklineData,
    target,
    status = "default",
    ...props
  }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)

    // Calculate trend and change if previous value provided
    const calculatedData = React.useMemo(() => {
      if (previousValue !== undefined && showChange) {
        return calculateChange(value, previousValue)
      }
      return null
    }, [value, previousValue, showChange])

    // Determine trend
    const finalTrend = trendProp || calculatedData?.trend || "neutral"
    
    // Determine change to display
    const displayChange = React.useMemo(() => {
      if (change !== undefined) return change
      if (calculatedData) {
        return changeType === "percentage" 
          ? calculatedData.changePercentage 
          : calculatedData.change
      }
      return null
    }, [change, calculatedData, changeType])

    // Animate on mount
    React.useEffect(() => {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }, [])

    // Trend icons and colors
    const trendConfig = {
      up: {
        icon: TrendingUp,
        color: "text-[var(--vm-color-success)]",
        bgColor: "bg-[var(--vm-success-50)]",
        symbol: "+",
      },
      down: {
        icon: TrendingDown,
        color: "text-[var(--vm-color-error)]",
        bgColor: "bg-[var(--vm-error-50)]",
        symbol: "",
      },
      neutral: {
        icon: Minus,
        color: "text-[var(--vm-color-muted)]",
        bgColor: "bg-[var(--vm-color-surface-elevated)]",
        symbol: "",
      },
    }

    const currentTrendConfig = trendConfig[finalTrend]

    if (loading) {
      return (
        <Card className={cn(metricCardVariants({ variant, size }), className)}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-[var(--vm-color-border)] rounded w-1/2" />
            <div className="h-8 bg-[var(--vm-color-border)] rounded w-3/4" />
            <div className="h-3 bg-[var(--vm-color-border)] rounded w-1/3" />
          </div>
        </Card>
      )
    }

    return (
      <Card
        ref={ref}
        variant="elevated"
        className={cn(
          metricCardVariants({ variant, size, trend: finalTrend }),
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className={cn(
                "p-2 rounded-lg",
                status === "success" && "bg-[var(--vm-success-100)] text-[var(--vm-success-600)]",
                status === "warning" && "bg-[var(--vm-warning-100)] text-[var(--vm-warning-600)]",
                status === "error" && "bg-[var(--vm-error-100)] text-[var(--vm-error-600)]",
                status === "default" && "bg-[var(--vm-color-surface-elevated)] text-[var(--vm-color-muted)]"
              )}>
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-[var(--vm-color-muted)] truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--vm-color-muted)] mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {showOptions && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onOptionClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </Button>
          )}
        </div>

        {/* Value */}
        <div className="flex items-end justify-between mb-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="text-3xl font-bold text-[var(--vm-color-foreground)]">
              {formatNumber(value, precision, prefix, suffix)}
            </div>
          </motion.div>

          {/* Sparkline */}
          {sparklineData && (
            <div className={currentTrendConfig.color}>
              <Sparkline data={sparklineData} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Change Indicator */}
          {showChange && displayChange !== null && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={isVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex items-center space-x-2"
            >
              {showTrend && (
                <div className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full",
                  currentTrendConfig.bgColor
                )}>
                  <currentTrendConfig.icon size={12} className={currentTrendConfig.color} />
                </div>
              )}
              
              <div className={cn("text-sm font-medium", currentTrendConfig.color)}>
                {currentTrendConfig.symbol}
                {changeType === "percentage" 
                  ? `${Math.abs(Number(displayChange)).toFixed(1)}%`
                  : formatNumber(Math.abs(Number(displayChange)), precision)
                }
              </div>
            </motion.div>
          )}

          {/* Target Progress */}
          {target && (
            <div className="text-xs text-[var(--vm-color-muted)]">
              Target: {formatNumber(target, precision, prefix, suffix)}
            </div>
          )}

          {/* Additional Info */}
          {previousValue && (
            <div className="text-xs text-[var(--vm-color-muted)]">
              vs {formatNumber(previousValue, precision, prefix, suffix)}
            </div>
          )}
        </div>

        {/* Progress Bar for Target */}
        {target && (
          <div className="mt-3">
            <div className="w-full bg-[var(--vm-color-surface-elevated)] rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-[var(--vm-color-primary)]"
                initial={{ width: 0 }}
                animate={isVisible ? { width: `${Math.min((Number(value) / target) * 100, 100)}%` } : {}}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        )}
      </Card>
    )
  }
)

MetricCard.displayName = "MetricCard"

/**
 * Metric Cards Grid Layout
 */
export interface MetricCardsGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 6
}

const MetricCardsGrid = React.forwardRef<HTMLDivElement, MetricCardsGridProps>(
  ({ className, children, columns = 4, ...props }, ref) => {
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-4 md:gap-6",
          gridCols[columns],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

MetricCardsGrid.displayName = "MetricCardsGrid"

export { MetricCard, MetricCardsGrid, Sparkline, metricCardVariants }
export type { MetricCardProps, MetricCardsGridProps }