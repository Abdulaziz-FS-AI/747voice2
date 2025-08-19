/**
 * Executive Skeleton Component
 * Voice Matrix Professional Design System v7.0
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Executive Skeleton variants
 */
const skeletonVariants = cva(
  [
    // Executive base styles
    "vm-focus-executive theme-transition",
    "relative overflow-hidden",
    "bg-gradient-to-r from-[oklch(0.1800_0.0450_240)] via-[oklch(0.2200_0.0500_245)] to-[oklch(0.1800_0.0450_240)]",
    "bg-[length:200%_100%]",
    "animate-shimmer",
  ],
  {
    variants: {
      variant: {
        default: [
          // Executive Default Skeleton
          "rounded-[14px]",
        ],
        text: [
          // Executive Text Skeleton
          "rounded-[4px]",
          "h-4",
        ],
        avatar: [
          // Executive Avatar Skeleton
          "rounded-full",
        ],
        button: [
          // Executive Button Skeleton
          "rounded-[14px]",
          "h-11",
        ],
        card: [
          // Executive Card Skeleton
          "rounded-[18px]",
        ],
      },
      size: {
        xs: "h-3",
        sm: "h-4", 
        md: "h-6",
        lg: "h-8",
        xl: "h-12",
      },
      animation: {
        pulse: "animate-pulse",
        shimmer: "animate-shimmer",
        wave: "animate-wave",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "shimmer",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Executive Skeleton Component
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, animation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size, animation }), className)}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

/**
 * Specialized skeleton variants for common use cases
 */

// Text Block Skeleton
export interface TextSkeletonProps extends Omit<SkeletonProps, "variant"> {
  lines?: number
  spacing?: "tight" | "normal" | "loose"
}

export const TextSkeleton = React.forwardRef<HTMLDivElement, TextSkeletonProps>(
  ({ lines = 3, spacing = "normal", className, ...props }, ref) => {
    const spacingMap = {
      tight: "space-y-1",
      normal: "space-y-2", 
      loose: "space-y-3",
    }

    return (
      <div ref={ref} className={cn("w-full", spacingMap[spacing], className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={cn(
              i === lines - 1 && "w-3/4", // Last line shorter
              i === 0 && "w-full", // First line full width
              i > 0 && i < lines - 1 && "w-full" // Middle lines full width
            )}
            {...props}
          />
        ))}
      </div>
    )
  }
)

TextSkeleton.displayName = "TextSkeleton"

// Card Skeleton
export interface CardSkeletonProps extends Omit<SkeletonProps, "variant"> {
  avatar?: boolean
  title?: boolean
  description?: boolean
  action?: boolean
}

export const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ avatar = false, title = true, description = true, action = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-6 space-y-4", className)}>
        {avatar && (
          <Skeleton variant="avatar" className="h-12 w-12" {...props} />
        )}
        {title && (
          <Skeleton variant="text" className="h-6 w-3/4" {...props} />
        )}
        {description && (
          <TextSkeleton lines={2} spacing="tight" {...props} />
        )}
        {action && (
          <Skeleton variant="button" className="w-24" {...props} />
        )}
      </div>
    )
  }
)

CardSkeleton.displayName = "CardSkeleton"

// Table Skeleton
export interface TableSkeletonProps extends Omit<SkeletonProps, "variant"> {
  rows?: number
  columns?: number
}

export const TableSkeleton = React.forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ rows = 5, columns = 4, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} variant="text" className="h-5" {...props} />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={`cell-${rowIndex}-${colIndex}`} 
                variant="text" 
                className={cn(
                  "h-4",
                  colIndex === 0 && "w-3/4", // First column shorter
                  colIndex > 0 && "w-full" // Other columns full width
                )}
                {...props} 
              />
            ))}
          </div>
        ))}
      </div>
    )
  }
)

TableSkeleton.displayName = "TableSkeleton"

export { Skeleton, skeletonVariants }
export type { SkeletonProps }