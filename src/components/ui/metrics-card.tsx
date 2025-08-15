import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

/**
 * Premium Metrics Card Component
 * Designed for executive dashboard with glassmorphism and micro-interactions
 */

const metricsCardVariants = cva(
  [
    // Base styles using executive design system
    "vm-card theme-transition relative group",
    "overflow-hidden backdrop-blur-lg",
    "border border-vm-glass-border",
    "bg-gradient-to-br from-vm-glass to-vm-surface-elevated",
    "hover:border-vm-ring transition-all duration-vm-normal ease-vm-luxury",
  ],
  {
    variants: {
      variant: {
        default: [
          "shadow-vm-md hover:shadow-vm-xl",
          "hover:translate-y-[-2px]",
        ],
        premium: [
          "shadow-vm-lg hover:shadow-vm-2xl",
          "hover:translate-y-[-4px]",
          "border-vm-glass-border/50",
          "bg-gradient-to-br from-vm-glass via-vm-surface-elevated to-vm-surface-overlay",
        ],
        success: [
          "border-vm-success/30",
          "bg-gradient-to-br from-vm-success/10 to-vm-surface-elevated",
          "shadow-vm-md hover:shadow-vm-xl",
        ],
        warning: [
          "border-vm-warning/30", 
          "bg-gradient-to-br from-vm-warning/10 to-vm-surface-elevated",
          "shadow-vm-md hover:shadow-vm-xl",
        ],
        danger: [
          "border-vm-destructive/30",
          "bg-gradient-to-br from-vm-destructive/10 to-vm-surface-elevated", 
          "shadow-vm-md hover:shadow-vm-xl",
        ],
      },
      size: {
        sm: ["p-4 min-h-[120px]"],
        md: ["p-6 min-h-[140px]"],
        lg: ["p-8 min-h-[180px]"],
      },
      glow: {
        true: ["shadow-vm-glow-primary"],
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      glow: false,
    },
  }
)

const metricsValueVariants = cva(
  [
    "font-display font-bold transition-all duration-vm-normal",
  ],
  {
    variants: {
      size: {
        sm: ["text-2xl"],
        md: ["text-3xl"],
        lg: ["text-4xl"],
      },
      emphasis: {
        default: ["text-vm-foreground"],
        primary: ["text-vm-primary vm-text-glow"],
        gradient: ["vm-text-gradient"],
        premium: ["vm-text-premium"],
      }
    },
    defaultVariants: {
      size: "md",
      emphasis: "default",
    },
  }
)

interface MetricsCardProps 
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof metricsCardVariants> {
  icon?: React.ReactNode
  label: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  description?: string
  valueEmphasis?: VariantProps<typeof metricsValueVariants>["emphasis"]
  animated?: boolean
  asMotion?: boolean
  motionProps?: HTMLMotionProps<"div">
}

const MetricsCard = React.forwardRef<HTMLDivElement, MetricsCardProps>(
  ({ 
    className, 
    variant, 
    size, 
    glow,
    icon,
    label,
    value,
    change,
    changeType = "neutral",
    description,
    valueEmphasis = "default",
    animated = true,
    asMotion = false,
    motionProps,
    ...props 
  }, ref) => {
    const cardContent = (
      <>
        {/* Top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vm-primary/50 to-transparent opacity-60" />
        
        {/* Icon and Label Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0 p-2 rounded-lg bg-vm-primary/10 border border-vm-primary/20">
                <div className="w-5 h-5 text-vm-primary">
                  {icon}
                </div>
              </div>
            )}
            <div>
              <h3 className="vm-text-small font-medium vm-subheading-contrast">
                {label}
              </h3>
              {description && (
                <p className="vm-text-micro vm-text-emphasis mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Value and Change Row */}
        <div className="flex items-end justify-between">
          <div className="flex-1">
            <div className={cn(
              metricsValueVariants({ 
                size: size === "sm" ? "sm" : size === "lg" ? "lg" : "md",
                emphasis: valueEmphasis 
              })
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
          </div>
          
          {change && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              changeType === "positive" && "bg-vm-success/20 text-vm-success border border-vm-success/30",
              changeType === "negative" && "bg-vm-destructive/20 text-vm-destructive border border-vm-destructive/30", 
              changeType === "neutral" && "bg-vm-muted-surface text-vm-muted border border-vm-border"
            )}>
              {changeType === "positive" && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              )}
              {changeType === "negative" && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-vm-normal pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-vm-primary/5 via-transparent to-vm-accent/5 rounded-lg" />
        </div>
      </>
    )

    const cardProps = {
      ref,
      className: cn(metricsCardVariants({ variant, size, glow }), className),
      ...props
    }

    if (asMotion) {
      const defaultMotionProps: HTMLMotionProps<"div"> = {
        initial: animated ? { opacity: 0, y: 20, scale: 0.95 } : undefined,
        animate: animated ? { opacity: 1, y: 0, scale: 1 } : undefined,
        whileHover: { y: -2, scale: 1.02 },
        transition: { 
          duration: 0.3, 
          ease: [0.25, 0.1, 0.25, 1] 
        },
        ...motionProps
      }

      return (
        <motion.div {...cardProps} {...defaultMotionProps}>
          {cardContent}
        </motion.div>
      )
    }

    return (
      <div {...cardProps}>
        {cardContent}
      </div>
    )
  }
)

MetricsCard.displayName = "MetricsCard"

/**
 * Preset metric card variants for common use cases
 */

interface ActiveAssistantsCardProps {
  count: number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}

const ActiveAssistantsCard = ({ count, change, changeType }: ActiveAssistantsCardProps) => (
  <MetricsCard
    variant="premium"
    icon={
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    }
    label="AI Assistants"
    value={count}
    change={change}
    changeType={changeType}
    description="Active and ready"
    valueEmphasis="primary"
    asMotion
    glow
  />
)

interface TotalCallsCardProps {
  count: number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}

const TotalCallsCard = ({ count, change, changeType }: TotalCallsCardProps) => (
  <MetricsCard
    variant="success"
    icon={
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    }
    label="Total Calls"
    value={count}
    change={change}
    changeType={changeType}
    description="Last 30 days"
    valueEmphasis="gradient"
    asMotion
  />
)

interface CallDurationCardProps {
  duration: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}

const CallDurationCard = ({ duration, change, changeType }: CallDurationCardProps) => (
  <MetricsCard
    variant="default"
    icon={
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
    }
    label="Call Duration"
    value={duration}
    change={change}
    changeType={changeType}
    description="Total minutes"
    valueEmphasis="default"
    asMotion
  />
)

interface SuccessRateCardProps {
  rate: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}

const SuccessRateCard = ({ rate, change, changeType }: SuccessRateCardProps) => (
  <MetricsCard
    variant="warning"
    icon={
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 3v18h18"/>
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
      </svg>
    }
    label="Success Rate"
    value={rate}
    change={change}
    changeType={changeType}
    description="Avg performance"
    valueEmphasis="premium"
    asMotion
  />
)

export {
  MetricsCard,
  ActiveAssistantsCard,
  TotalCallsCard,
  CallDurationCard,
  SuccessRateCard,
  metricsCardVariants,
  metricsValueVariants,
}
export type { MetricsCardProps }