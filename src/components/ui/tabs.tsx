import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * Tabs list container with variants
 */
const tabsListVariants = cva(
  [
    // Base styles using design system tokens
    "vm-focus-ring theme-transition",
    "inline-flex items-center justify-center",
    "transition-all duration-normal ease-out",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-muted-surface border border-border rounded-lg p-1",
          "text-muted",
        ],
        underline: [
          "bg-transparent border-b border-border",
          "text-muted rounded-none p-0",
        ],
        pills: [
          "bg-transparent text-muted",
          "rounded-full p-1 gap-1",
        ],
        ghost: [
          "bg-transparent text-muted",
          "rounded-none p-0 gap-2",
        ],
        elevated: [
          "bg-surface border border-border rounded-xl p-1",
          "shadow-sm text-muted",
        ],
      },
      size: {
        sm: ["h-8 text-xs"],
        md: ["h-10 text-sm"],
        lg: ["h-12 text-base"],
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:border-2 data-[theme=brutalist]:border-foreground",
          "data-[theme=brutalist]:rounded-none data-[theme=brutalist]:bg-surface",
        ],
      },
      {
        variant: "elevated",
        className: [
          "data-[theme=premium-dark]:bg-gradient-surface",
          "data-[theme=premium-dark]:border-border-subtle",
        ],
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  }
)

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, size, fullWidth, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      tabsListVariants({ variant, size, fullWidth }),
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

/**
 * Tabs trigger with variants to match parent list style
 */
const tabsTriggerVariants = cva(
  [
    // Base styles using design system tokens
    "vm-focus-ring theme-transition",
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium cursor-pointer",
    "transition-all duration-normal ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative",
  ],
  {
    variants: {
      variant: {
        default: [
          "rounded-md px-3 py-1.5",
          "data-[state=active]:bg-surface data-[state=active]:text-foreground",
          "data-[state=active]:shadow-sm",
          "hover:bg-surface/50 hover:text-foreground",
        ],
        underline: [
          "rounded-none px-4 py-2 border-b-2 border-transparent",
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
          "hover:border-border hover:text-foreground",
        ],
        pills: [
          "rounded-full px-4 py-1.5",
          "data-[state=active]:bg-primary data-[state=active]:text-foreground",
          "hover:bg-surface hover:text-foreground",
        ],
        ghost: [
          "rounded-md px-3 py-1.5",
          "data-[state=active]:bg-transparent data-[state=active]:text-foreground",
          "data-[state=active]:font-semibold",
          "hover:bg-surface/50 hover:text-foreground",
        ],
        elevated: [
          "rounded-lg px-3 py-1.5",
          "data-[state=active]:bg-background data-[state=active]:text-foreground",
          "data-[state=active]:shadow-md",
          "hover:bg-surface hover:text-foreground",
        ],
      },
      size: {
        sm: ["px-2 py-1 text-xs"],
        md: ["px-3 py-1.5 text-sm"],
        lg: ["px-4 py-2 text-base"],
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:data-[state=active]:bg-accent",
          "data-[theme=brutalist]:data-[state=active]:text-foreground",
          "data-[theme=brutalist]:data-[state=active]:font-black",
          "data-[theme=brutalist]:rounded-none",
        ],
      },
      {
        variant: "underline",
        className: [
          "data-[theme=brutalist]:border-b-4 data-[theme=brutalist]:data-[state=active]:border-foreground",
        ],
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  badge?: string | number
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ 
  className, 
  variant, 
  size, 
  leftIcon,
  rightIcon,
  badge,
  children,
  ...props 
}, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      tabsTriggerVariants({ variant, size }),
      className
    )}
    {...props}
  >
    {leftIcon && (
      <span className="inline-flex shrink-0 items-center justify-center">
        {leftIcon}
      </span>
    )}
    <span className="flex-1">{children}</span>
    {badge && (
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
        {badge}
      </span>
    )}
    {rightIcon && (
      <span className="inline-flex shrink-0 items-center justify-center">
        {rightIcon}
      </span>
    )}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

/**
 * Tabs content with spacing and animation options
 */
interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  spacing?: "none" | "sm" | "md" | "lg"
  animated?: boolean
}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, spacing = "md", animated = true, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "vm-focus-ring",
      // Spacing variants
      spacing === "none" && "mt-0",
      spacing === "sm" && "mt-2",
      spacing === "md" && "mt-4",
      spacing === "lg" && "mt-6",
      // Animation
      animated && [
        "transition-all duration-normal ease-out",
        "data-[state=active]:animate-fade-in",
        "data-[state=inactive]:animate-fade-out",
      ],
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  tabsListVariants,
  tabsTriggerVariants,
}
export type {
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
}