"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Enhanced Skeleton component variants
 * Modern loading placeholders with smooth animations
 */
const skeletonVariants = cva(
  [
    "animate-pulse bg-gradient-to-r",
    "from-[var(--vm-color-surface-elevated)]",
    "via-[var(--vm-color-border)]", 
    "to-[var(--vm-color-surface-elevated)]",
    "bg-[length:200%_100%]",
    "animate-shimmer",
  ],
  {
    variants: {
      variant: {
        default: "rounded-md",
        text: "rounded",
        circle: "rounded-full",
        rectangular: "rounded-none",
      },
      size: {
        xs: "h-2",
        sm: "h-3", 
        md: "h-4",
        lg: "h-5",
        xl: "h-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Base Skeleton component
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)

Skeleton.displayName = "Skeleton"

/**
 * Skeleton presets for common UI patterns
 */

// Avatar skeleton
export const SkeletonAvatar = React.forwardRef<HTMLDivElement, 
  Omit<SkeletonProps, 'variant'> & { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    xs: "w-6 h-6",
    sm: "w-8 h-8", 
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  }

  return (
    <Skeleton
      ref={ref}
      variant="circle"
      className={cn(sizeClasses[size], className)}
      {...props}
    />
  )
})

SkeletonAvatar.displayName = "SkeletonAvatar"

// Text skeleton
export const SkeletonText = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'variant'> & { 
    lines?: number
    width?: string | number
  }
>(({ className, lines = 1, width, ...props }, ref) => {
  if (lines === 1) {
    return (
      <Skeleton
        ref={ref}
        variant="text"
        className={cn("h-4", width && `w-[${width}]`, className)}
        {...props}
      />
    )
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full",
            className
          )}
          {...props}
        />
      ))}
    </div>
  )
})

SkeletonText.displayName = "SkeletonText"

// Card skeleton
export const SkeletonCard = React.forwardRef<HTMLDivElement,
  Omit<SkeletonProps, 'variant'> & {
    hasImage?: boolean
    lines?: number
  }
>(({ className, hasImage = false, lines = 2, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "space-y-3 p-6 rounded-lg border border-[var(--vm-color-border)]",
        "bg-[var(--vm-color-surface)]",
        className
      )}
      {...props}
    >
      {hasImage && (
        <Skeleton className="h-48 w-full rounded-md" />
      )}
      <div className="space-y-2">
        <Skeleton className="h-5 w-1/2" />
        <SkeletonText lines={lines} />
      </div>
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-4 w-20" />
        <div className="h-8 w-20 rounded-lg animate-pulse bg-gradient-to-r from-[var(--vm-color-surface-elevated)] to-[var(--vm-color-border)]" />
      </div>
    </div>
  )
})

SkeletonCard.displayName = "SkeletonCard"

export { 
  Skeleton, 
  skeletonVariants 
}

export type { SkeletonProps }