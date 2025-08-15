import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Badge component variants using CVA
 * Integrated with Voice Matrix unified design system
 */
const badgeVariants = cva(
  [
    // Base styles using design system tokens
    "vm-focus-ring theme-transition",
    "inline-flex items-center justify-center gap-1",
    "font-medium whitespace-nowrap",
    "transition-all duration-fast ease-out",
    "border select-none",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-foreground border-transparent",
          "hover:bg-primary/90",
        ],
        secondary: [
          "bg-surface text-foreground border-border",
          "hover:bg-surface-elevated",
        ],
        accent: [
          "bg-accent text-accent-foreground border-transparent",
          "hover:bg-accent/90",
        ],
        success: [
          "bg-success text-success-foreground border-transparent",
          "hover:bg-success/90",
        ],
        warning: [
          "bg-warning text-warning-foreground border-transparent",
          "hover:bg-warning/90",
        ],
        destructive: [
          "bg-destructive text-destructive-foreground border-transparent",
          "hover:bg-destructive/90",
        ],
        outline: [
          "bg-transparent text-foreground border-border",
          "hover:bg-surface",
        ],
        ghost: [
          "bg-transparent text-muted border-transparent",
          "hover:bg-surface hover:text-foreground",
        ],
        gradient: [
          "bg-gradient-primary text-foreground border-transparent",
          "hover:opacity-90",
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