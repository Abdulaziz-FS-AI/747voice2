import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

/**
 * Dropdown menu sub-trigger with same styling as menu item
 */
interface DropdownMenuSubTriggerProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>,
    VariantProps<typeof dropdownMenuItemVariants> {
  leftIcon?: React.ReactNode
}

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  DropdownMenuSubTriggerProps
>(({ className, variant, size, inset, leftIcon, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      dropdownMenuItemVariants({ variant, size, inset }),
      "data-[state=open]:bg-surface-elevated data-[state=open]:text-foreground",
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
    <ChevronRight className="ml-auto h-3 w-3" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

/**
 * Dropdown menu sub-content with same styling as main content
 */
interface DropdownMenuSubContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>,
    VariantProps<typeof dropdownMenuContentVariants> {}

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  DropdownMenuSubContentProps
>(({ className, size, variant, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      dropdownMenuContentVariants({ size, variant }),
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

/**
 * Dropdown menu content with enhanced styling and theme support
 */
const dropdownMenuContentVariants = cva(
  [
    // Base styles using design system tokens
    "z-dropdown min-w-32 overflow-hidden",
    "border border-border bg-surface",
    "text-foreground shadow-lg",
    "transition-all duration-fast ease-out",
    // Animations
    "data-[state=open]:animate-scale-in",
    "data-[state=closed]:animate-scale-out",
    "data-[side=bottom]:slide-in-from-top-2",
    "data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2",
    "data-[side=top]:slide-in-from-bottom-2",
  ],
  {
    variants: {
      size: {
        sm: ["min-w-24 p-1 rounded-md"],
        md: ["min-w-32 p-1 rounded-lg"],
        lg: ["min-w-40 p-2 rounded-lg"],
      },
      variant: {
        default: [
          "bg-surface border-border",
        ],
        elevated: [
          "bg-surface-elevated border-border-subtle",
          "shadow-xl",
        ],
        glass: [
          "vm-glass border-border-subtle",
          "backdrop-blur-lg",
        ],
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:border-2 data-[theme=brutalist]:border-foreground",
          "data-[theme=brutalist]:rounded-none data-[theme=brutalist]:shadow-[4px_4px_0px_0px_var(--vm-color-foreground)]",
        ],
      },
      {
        variant: "glass",
        className: [
          "data-[theme=premium-dark]:bg-gradient-surface",
        ],
      },
    ],
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>,
    VariantProps<typeof dropdownMenuContentVariants> {}

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, sideOffset = 4, size, variant, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        dropdownMenuContentVariants({ size, variant }),
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

/**
 * Dropdown menu item with variants and enhanced interactions
 */
const dropdownMenuItemVariants = cva(
  [
    // Base styles using design system tokens
    "relative flex cursor-pointer select-none items-center gap-2",
    "text-sm font-medium transition-all duration-fast",
    "outline-none focus:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "px-2 py-1.5 rounded-sm",
          "hover:bg-surface-elevated focus:bg-surface-elevated",
          "hover:text-foreground focus:text-foreground",
        ],
        ghost: [
          "px-2 py-1.5 rounded-sm",
          "hover:bg-surface focus:bg-surface",
          "text-muted hover:text-foreground focus:text-foreground",
        ],
        destructive: [
          "px-2 py-1.5 rounded-sm",
          "text-destructive hover:bg-destructive/10 focus:bg-destructive/10",
          "hover:text-destructive focus:text-destructive",
        ],
      },
      size: {
        sm: ["px-1.5 py-1 text-xs"],
        md: ["px-2 py-1.5 text-sm"],
        lg: ["px-3 py-2 text-base"],
      },
      inset: {
        true: "pl-8",
        false: "",
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:hover:bg-accent data-[theme=brutalist]:hover:text-foreground",
          "data-[theme=brutalist]:focus:bg-accent data-[theme=brutalist]:focus:text-foreground",
        ],
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      inset: false,
    },
  }
)

interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof dropdownMenuItemVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  shortcut?: string
}

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ 
  className, 
  variant, 
  size, 
  inset,
  leftIcon,
  rightIcon,
  shortcut,
  children,
  ...props 
}, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      dropdownMenuItemVariants({ variant, size, inset }),
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
    {shortcut && (
      <span className="ml-auto text-xs text-muted tracking-widest">
        {shortcut}
      </span>
    )}
    {rightIcon && (
      <span className="inline-flex shrink-0 items-center justify-center">
        {rightIcon}
      </span>
    )}
  </DropdownMenuPrimitive.Item>
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName =
  DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

/**
 * Dropdown menu label with styling variants
 */
interface DropdownMenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> {
  inset?: boolean
  size?: "sm" | "md" | "lg"
}

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  DropdownMenuLabelProps
>(({ className, inset, size = "md", ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "font-semibold text-muted select-none",
      // Size variants
      size === "sm" && "px-1.5 py-1 text-xs",
      size === "md" && "px-2 py-1.5 text-sm",
      size === "lg" && "px-3 py-2 text-base",
      // Inset
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

/**
 * Dropdown menu separator with theme support
 */
const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn(
      "-mx-1 my-1 h-px bg-border transition-colors",
      "data-[theme=brutalist]:h-0.5 data-[theme=brutalist]:bg-foreground",
      className
    )}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  )
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  dropdownMenuContentVariants,
  dropdownMenuItemVariants,
}
export type {
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuLabelProps,
  DropdownMenuSubContentProps,
  DropdownMenuSubTriggerProps,
}