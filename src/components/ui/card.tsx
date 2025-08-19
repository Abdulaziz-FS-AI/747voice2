import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Enhanced Card component variants using CVA
 * Integrated with Voice Matrix modern design system
 */
const cardVariants = cva(
  [
    // Base styles using modern design system tokens
    "vm-focus-ring vm-transition",
    "relative overflow-hidden",
    "text-[var(--vm-color-foreground)]",
    "transition-all duration-300 ease-out",
    "transform-gpu will-change-transform",
  ],
  {
    variants: {
      variant: {
        default: [
          "border shadow-xs",
          "bg-[var(--vm-color-surface)] border-[var(--vm-color-border)]",
          "hover:shadow-sm hover:border-[var(--vm-color-border-strong)]",
        ],
        elevated: [
          "border shadow-sm",
          "bg-[var(--vm-color-surface-elevated)] border-[var(--vm-color-border-subtle)]",
          "hover:shadow-md hover:-translate-y-0.5",
        ],
        outline: [
          "bg-transparent border-2",
          "border-[var(--vm-color-border)] hover:border-[var(--vm-color-primary)]",
          "hover:bg-[var(--vm-color-surface-elevated)] hover:shadow-xs",
        ],
        ghost: [
          "bg-transparent border-transparent",
          "hover:bg-[var(--vm-color-surface-elevated)] hover:border-[var(--vm-color-border)]",
          "hover:shadow-xs",
        ],
        glass: [
          "vm-glass backdrop-blur-lg",
          "border-[var(--vm-color-border-subtle)]",
          "hover:bg-[var(--vm-glass-bg)] hover:shadow-md",
        ],
        premium: [
          "border shadow-lg",
          "bg-gradient-to-br from-[var(--vm-color-surface)] to-[var(--vm-color-surface-elevated)]",
          "border-[var(--vm-color-border-subtle)]",
          "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01]",
        ],
      },
      size: {
        xs: [
          "rounded-md text-xs",
        ],
        sm: [
          "rounded-md text-sm",
        ],
        md: [
          "rounded-lg text-base",
        ],
        lg: [
          "rounded-xl text-lg",
        ],
        xl: [
          "rounded-2xl text-xl",
        ],
        "2xl": [
          "rounded-3xl text-2xl",
        ],
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-12",
      },
      interactive: {
        true: [
          "cursor-pointer",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "active:translate-y-0 active:scale-[1.0]",
        ],
        false: "",
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:transform data-[theme=brutalist]:rotate-[-0.5deg]",
          "data-[theme=brutalist]:border-3 data-[theme=brutalist]:border-foreground",
          "data-[theme=brutalist]:hover:rotate-[0.5deg] data-[theme=brutalist]:hover:scale-[1.02]",
        ],
      },
      {
        variant: "glass",
        className: [
          "data-[theme=premium-dark]:bg-gradient-surface",
          "data-[theme=premium-dark]:border-border-subtle",
        ],
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
      padding: "none",
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asMotion?: boolean
  motionProps?: Omit<HTMLMotionProps<"div">, keyof React.HTMLAttributes<HTMLDivElement>>
}

/**
 * Card component with enhanced features
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    size, 
    padding, 
    interactive,
    asMotion = false,
    motionProps,
    children,
    ...props 
  }, ref) => {
    const Comp = asMotion ? motion.div : "div"

    // Motion variants for enhanced animations
    const motionVariants = {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.3, ease: "easeOut" }
      },
      hover: interactive ? { 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 }
      } : {},
      tap: interactive ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {},
    }

    if (asMotion) {
      return (
        <Comp
          ref={ref}
          className={cn(cardVariants({ variant, size, padding, interactive }), className)}
          variants={motionVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          whileTap="tap"
          {...motionProps}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, size, padding, interactive }), className)}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Card.displayName = "Card"

/**
 * Card header with flexible layout options
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: "left" | "center" | "right"
  spacing?: "tight" | "normal" | "loose"
  padding?: "sm" | "md" | "lg"
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, alignment = "left", spacing = "normal", padding = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col",
        // Alignment
        alignment === "center" && "items-center text-center",
        alignment === "right" && "items-end text-right",
        alignment === "left" && "items-start text-left",
        // Spacing
        spacing === "tight" && "space-y-1",
        spacing === "normal" && "space-y-2",
        spacing === "loose" && "space-y-4",
        // Padding
        padding === "sm" && "p-4",
        padding === "md" && "p-6",
        padding === "lg" && "p-8",
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

/**
 * Card title with size variants
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "sm" | "md" | "lg" | "xl"
  gradient?: boolean
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "md", gradient = false, as: Comp = "h3", ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(
        "font-semibold leading-tight tracking-tight",
        // Size variants
        size === "sm" && "text-lg",
        size === "md" && "text-xl",
        size === "lg" && "text-2xl",
        size === "xl" && "text-3xl",
        // Gradient text
        gradient && "vm-gradient-text",
        // Default color
        !gradient && "text-foreground",
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

/**
 * Card description with size variants
 */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "sm" | "md" | "lg"
  muted?: boolean
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size = "md", muted = true, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "leading-relaxed",
        // Size variants  
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-base",
        // Color variants
        muted ? "text-muted" : "text-foreground",
        className
      )}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

/**
 * Card content with padding options
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg"
  noPaddingTop?: boolean
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = "md", noPaddingTop = true, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        // Padding variants
        padding === "none" && "p-0",
        padding === "sm" && "p-4",
        padding === "md" && "p-6",
        padding === "lg" && "p-8",
        // Remove top padding if needed
        noPaddingTop && padding !== "none" && "pt-0",
        className
      )} 
      {...props} 
    />
  )
)
CardContent.displayName = "CardContent"

/**
 * Card footer with layout and padding options
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: "start" | "center" | "end" | "between" | "around"
  align?: "start" | "center" | "end"
  padding?: "none" | "sm" | "md" | "lg"
  noPaddingTop?: boolean
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ 
    className, 
    justify = "start", 
    align = "center", 
    padding = "md", 
    noPaddingTop = true,
    ...props 
  }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex",
        // Justify content
        justify === "start" && "justify-start",
        justify === "center" && "justify-center",
        justify === "end" && "justify-end",
        justify === "between" && "justify-between",
        justify === "around" && "justify-around",
        // Align items
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        // Padding variants
        padding === "none" && "p-0",
        padding === "sm" && "p-4",
        padding === "md" && "p-6",
        padding === "lg" && "p-8",
        // Remove top padding if needed
        noPaddingTop && padding !== "none" && "pt-0",
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

/**
 * Specialized card variants for common use cases
 */

// Product Card
export interface ProductCardProps extends CardProps {
  image?: string
  title: string
  description?: string
  price?: string
  badge?: string
  onAction?: () => void
  actionLabel?: string
}

export const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ 
    image, 
    title, 
    description, 
    price, 
    badge, 
    onAction, 
    actionLabel = "Add to Cart",
    className,
    ...props 
  }, ref) => (
    <Card 
      ref={ref}
      variant="elevated" 
      interactive={!!onAction}
      asMotion
      className={cn("overflow-hidden", className)}
      onClick={onAction}
      {...props}
    >
      {image && (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img 
            src={image} 
            alt={title}
            className="h-full w-full object-cover transition-transform duration-normal hover:scale-105"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle size="sm">{title}</CardTitle>
          {badge && (
            <span className="rounded-full bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <CardDescription size="sm">{description}</CardDescription>
        )}
      </CardHeader>
      {(price || onAction) && (
        <CardFooter justify="between">
          {price && <span className="text-lg font-semibold">{price}</span>}
          {onAction && (
            <button className="vm-button vm-button-primary px-4 py-2 text-sm">
              {actionLabel}
            </button>
          )}
        </CardFooter>
      )}
    </Card>
  )
)
ProductCard.displayName = "ProductCard"

// Stat Card
export interface StatCardProps extends CardProps {
  label: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  icon?: React.ReactNode
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, change, trend, icon, className, ...props }, ref) => (
    <Card 
      ref={ref}
      variant="elevated"
      className={className}
      {...props}
    >
      <CardContent>
        <div className="flex items-center justify-between space-y-0 pb-2">
          <CardDescription size="sm" className="font-medium">
            {label}
          </CardDescription>
          {icon && (
            <div className="text-muted">
              {icon}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className={cn(
              "text-xs",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted"
            )}>
              {change}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
)
StatCard.displayName = "StatCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants
}
export type { 
  CardProps, 
  CardHeaderProps, 
  CardTitleProps, 
  CardDescriptionProps, 
  CardContentProps, 
  CardFooterProps
}