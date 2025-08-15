import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Button component variants using CVA
 * Integrated with Voice Matrix unified design system
 */
const buttonVariants = cva(
  [
    // Base styles using design system tokens
    "vm-button vm-focus-ring theme-transition",
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap text-sm font-medium",
    "transition-all duration-fast ease-out",
    "cursor-pointer select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden",
  ],
  {
    variants: {
      variant: {
        primary: [
          "vm-button-primary",
          "bg-primary text-foreground",
          "shadow-sm hover:shadow-md",
          "hover:-translate-y-0.5 active:translate-y-0",
          "hover:scale-[1.02] active:scale-[0.98]",
        ],
        secondary: [
          "vm-button-secondary", 
          "bg-surface text-foreground",
          "border border-border hover:bg-surface-elevated",
          "hover:border-border-subtle",
        ],
        ghost: [
          "vm-button-ghost",
          "bg-transparent text-muted",
          "hover:bg-surface hover:text-foreground",
        ],
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-sm hover:shadow-md",
          "hover:bg-destructive/90",
        ],
        outline: [
          "border-2 border-border bg-transparent",
          "text-foreground hover:bg-surface",
          "hover:border-foreground",
        ],
        link: [
          "text-primary underline-offset-4",
          "hover:underline bg-transparent",
          "p-0 h-auto font-normal",
        ],
        accent: [
          "bg-accent text-accent-foreground",
          "shadow-sm hover:shadow-accent",
          "hover:bg-accent/90 hover:scale-[1.02]",
        ],
        success: [
          "bg-success text-success-foreground",
          "shadow-sm hover:shadow-md",
          "hover:bg-success/90",
        ],
        warning: [
          "bg-warning text-warning-foreground", 
          "shadow-sm hover:shadow-md",
          "hover:bg-warning/90",
        ],
      },
      size: {
        sm: [
          "h-button-sm px-3 text-xs",
          "rounded-md gap-1",
        ],
        md: [
          "h-button-md px-4 py-2",
          "rounded-lg gap-2",
        ],
        lg: [
          "h-button-lg px-6 py-3 text-base",
          "rounded-xl gap-2",
        ],
        xl: [
          "h-14 px-8 py-4 text-lg",
          "rounded-2xl gap-3",
        ],
        icon: [
          "h-10 w-10 p-0",
          "rounded-lg",
        ],
        "icon-sm": [
          "h-8 w-8 p-0", 
          "rounded-md",
        ],
        "icon-lg": [
          "h-12 w-12 p-0",
          "rounded-xl",
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