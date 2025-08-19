import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Executive Button component variants using CVA
 * Voice Matrix Professional Design System v7.0
 */
const buttonVariants = cva(
  [
    // Executive base styles
    "vm-focus-executive theme-transition",
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium",
    "transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)",
    "cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden",
    "font-family: var(--vm-font-primary)",
  ],
  {
    variants: {
      variant: {
        primary: [
          // Voice Matrix Primary Button - Executive Blue
          "vm-button-primary vm-button-base",
          "bg-[var(--vm-color-primary)]",
          "text-[var(--vm-color-primary-foreground)]",
          "border-none",
        ],
        secondary: [
          // Voice Matrix Secondary - Glass Morphism
          "vm-button-secondary vm-button-base",
          "bg-[var(--vm-color-glass)]",
          "border border-[var(--vm-color-glass-border)]",
          "text-[var(--vm-color-foreground)]",
          "vm-backdrop-blur",
        ],
        ghost: [
          // Voice Matrix Ghost - Minimal Professional
          "vm-button-ghost vm-button-base",
          "bg-transparent border-none",
          "text-[var(--vm-color-muted)]",
        ],
        destructive: [
          // Voice Matrix Destructive - Professional Red
          "vm-button-base",
          "bg-[var(--vm-color-destructive)]",
          "text-[var(--vm-color-destructive-foreground)]",
          "border-none vm-shadow-primary",
        ],
        outline: [
          // Voice Matrix Outline - Professional Border
          "vm-button-base",
          "bg-transparent",
          "border-2 border-[var(--vm-color-border)]",
          "text-[var(--vm-color-foreground)]",
        ],
        link: [
          // Voice Matrix Link - Professional Typography
          "bg-transparent border-none p-0 h-auto",
          "text-[var(--vm-color-primary)] font-normal",
          "underline-offset-4 hover:underline",
          "vm-focus-ring",
        ],
        accent: [
          // Voice Matrix Accent - Electric Blue
          "vm-button-base",
          "bg-[var(--vm-color-accent)]",
          "text-[var(--vm-color-accent-foreground)]",
          "border-none vm-shadow-primary",
        ],
        gold: [
          // Voice Matrix Gold - Premium Accent
          "vm-button-gold vm-button-base",
          "bg-[var(--vm-color-gold)]",
          "text-[var(--vm-color-gold-foreground)]",
          "border-none",
        ],
        success: [
          // Voice Matrix Success - Professional Green
          "vm-button-base",
          "bg-[var(--vm-color-success)]",
          "text-[var(--vm-color-success-foreground)]",
          "border-none vm-shadow-primary",
        ],
        warning: [
          // Voice Matrix Warning - Professional Orange
          "vm-button-base",
          "bg-[var(--vm-color-warning)]",
          "text-[var(--vm-color-warning-foreground)]",
          "border-none vm-shadow-primary",
        ],
      },
      size: {
        sm: [
          // Voice Matrix Small Button
          "vm-button-sm",
          "h-8 px-3 text-[var(--vm-text-xs)]",
          "rounded-[var(--vm-radius-sm)] gap-1",
          "font-medium",
        ],
        md: [
          // Voice Matrix Medium Button (Default)
          "vm-button-md",
          "h-11 px-6 text-[var(--vm-text-sm)]",
          "rounded-[var(--vm-radius-lg)] gap-2",
          "font-medium",
        ],
        lg: [
          // Voice Matrix Large Button
          "vm-button-lg",
          "h-13 px-8 text-[var(--vm-text-base)]",
          "rounded-[var(--vm-radius-lg)] gap-2",
          "font-medium",
        ],
        xl: [
          // Voice Matrix Extra Large Button
          "vm-button-xl",
          "h-15 px-10 text-[var(--vm-text-lg)]",
          "rounded-[var(--vm-radius-xl)] gap-3",
          "font-semibold",
        ],
        icon: [
          // Voice Matrix Icon Button Standard
          "h-11 w-11 p-0",
          "rounded-[var(--vm-radius-lg)]",
        ],
        "icon-sm": [
          // Voice Matrix Small Icon Button
          "h-8 w-8 p-0",
          "rounded-[var(--vm-radius-sm)]",
        ],
        "icon-lg": [
          // Voice Matrix Large Icon Button
          "h-13 w-13 p-0",
          "rounded-[var(--vm-radius-xl)]",
        ],
      },
      loading: {
        true: "pointer-events-none",
      },
    },
    compoundVariants: [
      // Executive compound variants for enhanced interactions
      {
        variant: "primary",
        size: "sm",
        className: "shadow-[0_1px_4px_oklch(0.6489_0.2370_26.9728_/_0.15)]",
      },
      {
        variant: "primary", 
        size: ["md", "lg", "xl"],
        className: "shadow-[0_2px_8px_oklch(0.6489_0.2370_26.9728_/_0.2)]",
      },
      {
        variant: ["secondary", "outline"],
        size: "sm",
        className: "border",
      },
      {
        variant: ["secondary", "outline"],
        size: ["md", "lg", "xl"],
        className: "border-2",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

/**
 * Loading spinner component
 */
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <motion.div
    className="inline-block"
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
  >
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  </motion.div>
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loadingText?: string
  motionProps?: Omit<HTMLMotionProps<"button">, keyof React.ButtonHTMLAttributes<HTMLButtonElement>>
}

/**
 * Button component with advanced features
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    disabled,
    children,
    leftIcon,
    rightIcon,
    loadingText,
    motionProps,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : motion.button
    const isDisabled = disabled || loading

    const buttonContent = React.useMemo(() => {
      if (loading) {
        return (
          <>
            <LoadingSpinner size={size === "sm" ? 14 : size === "lg" || size === "xl" ? 18 : 16} />
            {loadingText && <span>{loadingText}</span>}
          </>
        )
      }

      return (
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
        </>
      )
    }, [loading, loadingText, leftIcon, rightIcon, children, size])

    // Motion variants for enhanced animations
    const motionVariants = {
      initial: { scale: 1 },
      hover: { 
        scale: variant === "link" ? 1 : 1.02,
        transition: { duration: 0.1 }
      },
      tap: { 
        scale: variant === "link" ? 1 : 0.98,
        transition: { duration: 0.05 }
      }
    }

    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, loading, className }))}
          disabled={isDisabled}
          {...props}
        >
          {buttonContent}
        </Slot>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        variants={motionVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        {...motionProps}
        {...props}
      >
        {buttonContent}
      </Comp>
    )
  }
)

Button.displayName = "Button"

/**
 * Button group component for multiple buttons
 */
interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  size?: VariantProps<typeof buttonVariants>["size"]
  variant?: VariantProps<typeof buttonVariants>["variant"]
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = "horizontal", size, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          orientation === "horizontal" ? "divide-x" : "divide-y",
          "divide-border overflow-hidden rounded-lg",
          className
        )}
        role="group"
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child) && child.type === Button) {
            return React.cloneElement(child, {
              size: child.props.size || size,
              variant: child.props.variant || variant,
              className: cn(
                child.props.className,
                "rounded-none",
                orientation === "horizontal" 
                  ? index === 0 
                    ? "rounded-l-lg" 
                    : index === React.Children.count(children) - 1 
                    ? "rounded-r-lg" 
                    : ""
                  : index === 0 
                  ? "rounded-t-lg" 
                  : index === React.Children.count(children) - 1 
                  ? "rounded-b-lg" 
                  : ""
              )
            })
          }
          return child
        })}
      </div>
    )
  }
)

ButtonGroup.displayName = "ButtonGroup"

/**
 * Icon button component for icon-only buttons
 */
interface IconButtonProps extends Omit<ButtonProps, "leftIcon" | "rightIcon"> {
  icon: React.ReactNode
  "aria-label": string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = "icon", ...props }, ref) => {
    return (
      <Button ref={ref} size={size} {...props}>
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = "IconButton"

export { Button, buttonVariants, ButtonGroup, IconButton }
export type { ButtonProps, ButtonGroupProps, IconButtonProps }