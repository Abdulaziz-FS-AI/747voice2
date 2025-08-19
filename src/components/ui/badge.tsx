import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Executive Badge component variants using CVA
 * Voice Matrix Professional Design System v7.0
 */
const badgeVariants = cva(
  [
    // Executive base styles
    "vm-focus-executive theme-transition",
    "inline-flex items-center justify-center gap-1",
    "font-medium whitespace-nowrap",
    "transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)",
    "border select-none",
    "font-family: var(--vm-font-primary)",
  ],
  {
    variants: {
      variant: {
        default: [
          // Executive Default - Professional Gold
          "bg-gradient-to-br from-[oklch(0.6489_0.2370_26.9728)] to-[oklch(0.5489_0.2370_26.9728)]",
          "text-white border-transparent",
          "shadow-[0_1px_4px_oklch(0.6489_0.2370_26.9728_/_0.2)]",
          "hover:shadow-[0_2px_8px_oklch(0.6489_0.2370_26.9728_/_0.3)]",
        ],
        secondary: [
          // Executive Secondary - Glass Morphism
          "bg-[oklch(0.1800_0.0450_240_/_0.9)] backdrop-blur-[12px]",
          "text-[oklch(0.9800_0.0200_230)] border-[oklch(0.4000_0.0500_245_/_0.8)]",
          "hover:bg-[oklch(0.2200_0.0500_245)]",
        ],
        accent: [
          // Executive Accent - Electric Blue
          "bg-[oklch(0.6000_0.1800_45)]",
          "text-black border-transparent",
          "shadow-[0_1px_4px_oklch(0.6000_0.1800_45_/_0.2)]",
          "hover:bg-[oklch(0.5000_0.1800_45)]",
        ],
        success: [
          // Executive Success - Professional Green
          "bg-[oklch(0.6800_0.1500_142)]",
          "text-black border-transparent",
          "shadow-[0_1px_4px_oklch(0.6800_0.1500_142_/_0.2)]",
          "hover:bg-[oklch(0.5800_0.1500_142)]",
        ],
        warning: [
          // Executive Warning - Professional Orange
          "bg-[oklch(0.7800_0.1400_85)]",
          "text-black border-transparent",
          "shadow-[0_1px_4px_oklch(0.7800_0.1400_85_/_0.2)]",
          "hover:bg-[oklch(0.6800_0.1400_85)]",
        ],
        destructive: [
          // Executive Destructive - Professional Red
          "bg-[oklch(0.5500_0.2000_25)]",
          "text-white border-transparent",
          "shadow-[0_1px_4px_oklch(0.5500_0.2000_25_/_0.2)]",
          "hover:bg-[oklch(0.4500_0.2000_25)]",
        ],
        outline: [
          // Executive Outline - Professional Border
          "bg-transparent text-[oklch(0.9800_0.0200_230)] border-[oklch(0.4000_0.0500_245)]",
          "hover:bg-[oklch(0.1800_0.0450_240)]",
          "hover:border-[oklch(0.6489_0.2370_26.9728)]",
        ],
        ghost: [
          // Executive Ghost - Minimal Professional
          "bg-transparent text-[oklch(0.7500_0.0300_235)] border-transparent",
          "hover:bg-[oklch(0.1800_0.0450_240)] hover:text-[oklch(0.9800_0.0200_230)]",
        ],
        premium: [
          // Executive Premium - Gold Accent
          "bg-[oklch(0.1800_0.0450_240)]",
          "text-[oklch(0.9800_0.0200_230)] border-[oklch(0.6489_0.2370_26.9728_/_0.3)]",
          "shadow-[0_1px_4px_oklch(0.6489_0.2370_26.9728_/_0.2)]",
          "hover:border-[oklch(0.6489_0.2370_26.9728_/_0.5)]",
        ],
      },
      size: {
        xs: [
          "h-4 px-1.5 text-[10px] rounded-sm",
          "gap-0.5",
        ],
        sm: [
          "h-5 px-2 text-xs rounded-md", 
          "gap-1",
        ],
        md: [
          "h-6 px-2.5 text-xs rounded-md",
          "gap-1",
        ],
        lg: [
          "h-7 px-3 text-sm rounded-lg",
          "gap-1.5",
        ],
        xl: [
          "h-8 px-4 text-sm rounded-lg",
          "gap-2",
        ],
      },
      shape: {
        rounded: "",
        pill: "rounded-full",
        square: "rounded-none",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "hover:scale-105 active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        ],
        false: "",
      },
      dot: {
        true: [
          "relative",
          "before:absolute before:inset-0 before:rounded-full",
          "before:bg-current before:opacity-20",
        ],
        false: "",
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:transform data-[theme=brutalist]:rotate-[-1deg]",
          "data-[theme=brutalist]:font-black data-[theme=brutalist]:uppercase",
          "data-[theme=brutalist]:hover:rotate-[1deg]",
        ],
      },
      {
        variant: "gradient",
        className: [
          "data-[theme=premium-dark]:relative data-[theme=premium-dark]:overflow-hidden",
          "data-[theme=premium-dark]:before:absolute data-[theme=premium-dark]:before:inset-0",
          "data-[theme=premium-dark]:before:bg-gradient-to-r data-[theme=premium-dark]:before:from-transparent",
          "data-[theme=premium-dark]:before:via-white/20 data-[theme=premium-dark]:before:to-transparent",
          "data-[theme=premium-dark]:before:translate-x-[-100%] data-[theme=premium-dark]:before:transition-transform",
          "data-[theme=premium-dark]:hover:before:translate-x-[100%]",
        ],
      },
      {
        size: "xs",
        shape: "pill",
        className: "rounded-full",
      },
      {
        interactive: true,
        variant: "outline",
        className: "hover:border-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "rounded",
      interactive: false,
      dot: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRemove?: () => void
  asMotion?: boolean
  motionProps?: Omit<HTMLMotionProps<"div">, keyof React.HTMLAttributes<HTMLDivElement>>
}

/**
 * Badge component with enhanced features
 */
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    shape, 
    interactive, 
    dot,
    leftIcon,
    rightIcon,
    onRemove,
    asMotion = false,
    motionProps,
    children,
    onClick,
    ...props 
  }, ref) => {
    const Comp = asMotion ? motion.div : "div"
    const isInteractive = interactive || !!onClick || !!onRemove

    // Motion variants for enhanced animations
    const motionVariants = {
      initial: { opacity: 0, scale: 0.8 },
      animate: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.2, ease: "easeOut" }
      },
      hover: isInteractive ? { 
        scale: 1.05,
        transition: { duration: 0.1 }
      } : {},
      tap: isInteractive ? { 
        scale: 0.95,
        transition: { duration: 0.05 }
      } : {},
      exit: {
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.15 }
      },
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onClick) {
        onClick(e)
      }
    }

    const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      if (onRemove) {
        onRemove()
      }
    }

    const content = (
      <>
        {leftIcon && (
          <span className="inline-flex shrink-0">
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon && (
          <span className="inline-flex shrink-0">
            {rightIcon}
          </span>
        )}
        {onRemove && (
          <button
            onClick={handleRemove}
            className={cn(
              "inline-flex shrink-0 items-center justify-center",
              "hover:bg-background rounded-full transition-colors",
              size === "xs" && "h-3 w-3 ml-0.5",
              size === "sm" && "h-3 w-3 ml-1",
              size === "md" && "h-4 w-4 ml-1",
              size === "lg" && "h-4 w-4 ml-1.5",
              size === "xl" && "h-5 w-5 ml-2"
            )}
            aria-label="Remove badge"
          >
            <svg
              className="h-full w-full"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </>
    )

    if (asMotion) {
      return (
        <Comp
          ref={ref}
          className={cn(
            badgeVariants({ 
              variant, 
              size, 
              shape, 
              interactive: isInteractive, 
              dot 
            }), 
            className
          )}
          onClick={isInteractive ? handleClick : undefined}
          variants={motionVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          exit="exit"
          {...motionProps}
          {...props}
        >
          {content}
        </Comp>
      )
    }

    return (
      <Comp
        ref={ref}
        className={cn(
          badgeVariants({ 
            variant, 
            size, 
            shape, 
            interactive: isInteractive, 
            dot 
          }), 
          className
        )}
        onClick={isInteractive ? handleClick : undefined}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Badge.displayName = "Badge"

/**
 * Specialized badge variants for common use cases
 */

// Status Badge
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'online' | 'offline' | 'away' | 'busy' | 'unknown'
}

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusConfig = {
      online: { variant: 'success' as const, dot: true, children: 'Online' },
      offline: { variant: 'secondary' as const, dot: true, children: 'Offline' },
      away: { variant: 'warning' as const, dot: true, children: 'Away' },
      busy: { variant: 'destructive' as const, dot: true, children: 'Busy' },
      unknown: { variant: 'ghost' as const, dot: true, children: 'Unknown' },
    }

    const config = statusConfig[status]

    return (
      <Badge
        ref={ref}
        className={className}
        {...config}
        {...props}
      />
    )
  }
)
StatusBadge.displayName = "StatusBadge"

// Count Badge
export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number
  max?: number
  showZero?: boolean
}

export const CountBadge = React.forwardRef<HTMLDivElement, CountBadgeProps>(
  ({ count, max = 99, showZero = false, className, ...props }, ref) => {
    if (count === 0 && !showZero) {
      return null
    }

    const displayCount = count > max ? `${max}+` : count.toString()

    return (
      <Badge
        ref={ref}
        variant="destructive"
        size="xs"
        shape="pill"
        className={cn("min-w-[1.25rem] h-5", className)}
        {...props}
      >
        {displayCount}
      </Badge>
    )
  }
)
CountBadge.displayName = "CountBadge"

// Tag Badge (removable)
export interface TagBadgeProps extends Omit<BadgeProps, 'onRemove'> {
  label: string
  onRemove?: (label: string) => void
}

export const TagBadge = React.forwardRef<HTMLDivElement, TagBadgeProps>(
  ({ label, onRemove, className, ...props }, ref) => {
    const handleRemove = () => {
      if (onRemove) {
        onRemove(label)
      }
    }

    return (
      <Badge
        ref={ref}
        variant="secondary"
        shape="pill"
        className={className}
        onRemove={onRemove ? handleRemove : undefined}
        {...props}
      >
        {label}
      </Badge>
    )
  }
)
TagBadge.displayName = "TagBadge"

export { Badge, badgeVariants }
export type { BadgeProps }