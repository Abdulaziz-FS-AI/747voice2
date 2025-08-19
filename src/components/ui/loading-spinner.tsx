"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

/**
 * Modern loading spinner variants
 * Multiple animation styles for different contexts
 */
const spinnerVariants = cva(
  [
    "inline-block animate-spin",
    "text-[var(--vm-color-primary)]",
  ],
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4", 
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12",
        "2xl": "w-16 h-16",
      },
      variant: {
        default: "",
        dots: "",
        pulse: "animate-pulse",
        bounce: "",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

/**
 * Default spinning circle loader
 */
const DefaultSpinner = ({ className, size }: { className?: string, size?: string }) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

/**
 * Three dots bouncing animation
 */
const DotsSpinner = ({ className, size }: { className?: string, size?: string }) => {
  const dotSize = size === "xs" ? "w-1 h-1" : 
                 size === "sm" ? "w-1.5 h-1.5" :
                 size === "lg" ? "w-2.5 h-2.5" :
                 size === "xl" ? "w-3 h-3" :
                 size === "2xl" ? "w-4 h-4" : "w-2 h-2"

  return (
    <div className={cn("flex space-x-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            dotSize,
            "bg-current rounded-full"
          )}
          animate={{
            y: ["0%", "-50%", "0%"],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

/**
 * Pulsing circle animation
 */
const PulseSpinner = ({ className, size }: { className?: string, size?: string }) => (
  <motion.div
    className={cn(
      "rounded-full border-2 border-current",
      className
    )}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1],
    }}
    transition={{
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
)

/**
 * Bouncing bars animation
 */
const BounceSpinner = ({ className, size }: { className?: string, size?: string }) => {
  const barWidth = size === "xs" ? "w-0.5" : 
                  size === "sm" ? "w-0.5" :
                  size === "lg" ? "w-1" :
                  size === "xl" ? "w-1.5" :
                  size === "2xl" ? "w-2" : "w-1"

  return (
    <div className={cn("flex items-end space-x-1", className)}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={cn(
            barWidth,
            "bg-current rounded-t"
          )}
          animate={{
            height: ["20%", "100%", "20%"],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

/**
 * Main LoadingSpinner component
 */
const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    const renderSpinner = () => {
      const spinnerClass = cn(spinnerVariants({ size }), className)
      
      switch (variant) {
        case "dots":
          return <DotsSpinner className={spinnerClass} size={size} />
        case "pulse":
          return <PulseSpinner className={spinnerClass} size={size} />
        case "bounce":
          return <BounceSpinner className={spinnerClass} size={size} />
        default:
          return <DefaultSpinner className={spinnerClass} size={size} />
      }
    }

    return (
      <div
        ref={ref}
        className={cn("inline-flex flex-col items-center justify-center", className)}
        role="status"
        aria-label={label || "Loading..."}
        {...props}
      >
        {renderSpinner()}
        {label && (
          <span className="mt-2 text-sm text-[var(--vm-color-muted)] animate-pulse">
            {label}
          </span>
        )}
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"

/**
 * Page-level loading overlay
 */
export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean
  label?: string
  backdrop?: "blur" | "dark" | "light"
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, isLoading = false, label, backdrop = "blur", children, ...props }, ref) => {
    if (!isLoading) return <>{children}</>

    const backdropClasses = {
      blur: "backdrop-blur-sm bg-[var(--vm-color-background)]/80",
      dark: "bg-black/50",
      light: "bg-white/80",
    }

    return (
      <div ref={ref} className="relative" {...props}>
        {children}
        <div className={cn(
          "absolute inset-0 z-50 flex items-center justify-center",
          backdropClasses[backdrop],
          className
        )}>
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="xl" />
            {label && (
              <p className="text-lg font-medium text-[var(--vm-color-foreground)]">
                {label}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }
)

LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingSpinner, LoadingOverlay, spinnerVariants }
export type { LoadingSpinnerProps, LoadingOverlayProps }