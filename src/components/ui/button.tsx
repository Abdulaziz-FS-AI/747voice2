import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Enhanced Button component variants using CVA
 * Integrated with Voice Matrix modern design system
 */
const buttonVariants = cva(
  [
    // Base styles using modern design system tokens
    "vm-focus-ring vm-transition",
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium",
    "cursor-pointer select-none relative overflow-hidden",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "border-0 text-center no-underline",
    // Enhanced hover and active states
    "transform-gpu will-change-transform",
    "transition-all duration-150 ease-out",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-white font-semibold",
          "shadow-sm hover:shadow-md active:shadow-sm",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
          // Using CSS custom properties for consistent theming
          "bg-[var(--vm-color-primary)] hover:bg-[var(--vm-color-primary-hover)]",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        secondary: [
          "font-medium border",
          "shadow-xs hover:shadow-sm active:shadow-xs",
          "hover:-translate-y-0.5 active:translate-y-0",
          "bg-[var(--vm-color-secondary)] hover:bg-[var(--vm-color-secondary-hover)]",
          "text-[var(--vm-color-secondary-foreground)] border-[var(--vm-color-border)]",
          "hover:border-[var(--vm-color-border-strong)]",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        ghost: [
          "font-medium bg-transparent",
          "text-[var(--vm-color-muted)] hover:text-[var(--vm-color-foreground)]",
          "hover:bg-[var(--vm-color-surface-elevated)]",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        destructive: [
          "text-white font-semibold",
          "shadow-sm hover:shadow-md active:shadow-sm",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
          "bg-[var(--vm-color-error)] hover:bg-[var(--vm-color-error-hover)]",
          "focus-visible:ring-red-200",
        ],
        outline: [
          "font-medium border-2 bg-transparent",
          "shadow-xs hover:shadow-sm active:shadow-xs",
          "hover:-translate-y-0.5 active:translate-y-0",
          "border-[var(--vm-color-border)] hover:border-[var(--vm-color-primary)]",
          "text-[var(--vm-color-foreground)] hover:bg-[var(--vm-color-surface-elevated)]",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        link: [
          "font-medium bg-transparent underline-offset-4",
          "text-[var(--vm-color-primary)] hover:text-[var(--vm-color-primary-hover)]",
          "hover:underline p-0 h-auto",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        accent: [
          "text-white font-semibold",
          "shadow-sm hover:shadow-lg active:shadow-sm",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
          "bg-[var(--vm-color-accent)] hover:bg-[var(--vm-color-accent-hover)]",
          "focus-visible:ring-purple-200",
        ],
        success: [
          "text-white font-semibold",
          "shadow-sm hover:shadow-md active:shadow-sm",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
          "bg-[var(--vm-color-success)] hover:bg-[var(--vm-color-success-hover)]",
          "focus-visible:ring-green-200",
        ],
        warning: [
          "text-white font-semibold",
          "shadow-sm hover:shadow-md active:shadow-sm",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
          "bg-[var(--vm-color-warning)] hover:bg-[var(--vm-color-warning-hover)]",
          "focus-visible:ring-yellow-200",
        ],
      },
      size: {
        xs: [
          "h-7 px-2 text-xs",
          "rounded-md gap-1 min-w-[2rem]",
        ],
        sm: [
          "h-8 px-3 text-xs",
          "rounded-md gap-1.5 min-w-[2.5rem]",
        ],
        md: [
          "h-10 px-4 text-sm",
          "rounded-lg gap-2 min-w-[3rem]",
        ],
        lg: [
          "h-12 px-6 text-base",
          "rounded-lg gap-2 min-w-[3.5rem]",
        ],
        xl: [
          "h-14 px-8 text-lg",
          "rounded-xl gap-3 min-w-[4rem]",
        ],
        icon: [
          "h-10 w-10 p-0",
          "rounded-lg shrink-0",
        ],
        "icon-sm": [
          "h-8 w-8 p-0", 
          "rounded-md shrink-0",
        ],
        "icon-lg": [
          "h-12 w-12 p-0",
          "rounded-lg shrink-0",
        ],
        "icon-xl": [
          "h-14 w-14 p-0",
          "rounded-xl shrink-0",
        ],
      },
      loading: {
        true: "pointer-events-none",
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "primary",
        className: [
          "data-[theme=brutalist]:transform data-[theme=brutalist]:rotate-[-1deg]",
          "data-[theme=brutalist]:hover:rotate-[1deg] data-[theme=brutalist]:hover:scale-105",
          "data-[theme=brutalist]:text-background data-[theme=brutalist]:font-black",
          "data-[theme=brutalist]:uppercase data-[theme=brutalist]:tracking-wider",
        ],
      },
      {
        variant: "primary", 
        className: [
          "data-[theme=premium-dark]:bg-gradient-primary",
          "data-[theme=premium-dark]:before:absolute data-[theme=premium-dark]:before:inset-0",
          "data-[theme=premium-dark]:before:bg-gradient-to-r data-[theme=premium-dark]:before:from-transparent",
          "data-[theme=premium-dark]:before:via-white/20 data-[theme=premium-dark]:before:to-transparent",
          "data-[theme=premium-dark]:before:translate-x-[-100%] data-[theme=premium-dark]:before:transition-transform",
          "data-[theme=premium-dark]:hover:before:translate-x-[100%]",
        ],
      },
      {
        variant: "outline",
        size: "sm",
        className: "border",
      },
      {
        variant: "outline", 
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