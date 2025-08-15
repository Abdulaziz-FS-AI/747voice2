import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Dialog overlay with enhanced blur and theme support
 */
interface DialogOverlayProps 
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> {
  blur?: "sm" | "md" | "lg" | "xl"
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, blur = "lg", ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Base overlay styles with design system tokens
      "fixed inset-0 z-overlay",
      "bg-background/80 transition-all duration-normal",
      // Blur variants
      blur === "sm" && "backdrop-blur-sm",
      blur === "md" && "backdrop-blur-md", 
      blur === "lg" && "backdrop-blur-lg",
      blur === "xl" && "backdrop-blur-xl",
      // Animations
      "data-[state=open]:animate-fade-in",
      "data-[state=closed]:animate-fade-out",
      // Theme-specific styles
      "data-[theme=premium-dark]:bg-background/60",
      "data-[theme=brutalist]:bg-background/90 data-[theme=brutalist]:backdrop-blur-none",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Dialog content variants using CVA
 * Integrated with Voice Matrix unified design system
 */
const dialogContentVariants = cva(
  [
    // Base styles using design system tokens
    "vm-focus-ring theme-transition",
    "fixed left-[50%] top-[50%] z-modal",
    "grid w-full translate-x-[-50%] translate-y-[-50%]",
    "gap-fluid-sm border border-border",
    "bg-surface shadow-xl",
    "transition-all duration-normal ease-luxury",
    // Default animations
    "data-[state=open]:animate-scale-in",
    "data-[state=closed]:animate-scale-out",
  ],
  {
    variants: {
      size: {
        xs: [
          "max-w-xs p-4 gap-3",
          "rounded-lg",
        ],
        sm: [
          "max-w-sm p-5 gap-4",
          "rounded-lg",
        ],
        md: [
          "max-w-md p-6 gap-4",
          "rounded-xl",
        ],
        lg: [
          "max-w-lg p-6 gap-6",
          "rounded-xl",
        ],
        xl: [
          "max-w-xl p-8 gap-6",
          "rounded-2xl",
        ],
        "2xl": [
          "max-w-2xl p-8 gap-8",
          "rounded-2xl",
        ],
        full: [
          "max-w-[95vw] max-h-[95vh] p-6 gap-6",
          "rounded-xl",
        ],
      },
      variant: {
        default: [
          "bg-surface border-border",
        ],
        elevated: [
          "bg-surface-elevated border-border-subtle",
          "shadow-2xl",
        ],
        glass: [
          "vm-glass border-border-subtle",
          "backdrop-blur-xl",
        ],
        destructive: [
          "bg-surface border-destructive/20",
          "shadow-destructive/10",
        ],
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "default",
        className: [
          "data-[theme=brutalist]:transform data-[theme=brutalist]:rotate-[-0.5deg]",
          "data-[theme=brutalist]:border-2 data-[theme=brutalist]:border-foreground",
          "data-[theme=brutalist]:rounded-none data-[theme=brutalist]:shadow-[8px_8px_0px_0px_var(--vm-color-foreground)]",
        ],
      },
      {
        variant: "glass",
        className: [
          "data-[theme=premium-dark]:bg-gradient-surface",
          "data-[theme=premium-dark]:border-border-subtle",
        ],
      },
    ],
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  showCloseButton?: boolean
  closeButtonVariant?: "default" | "ghost" | "outline"
  overlayBlur?: "sm" | "md" | "lg" | "xl"
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ 
  className, 
  children, 
  size, 
  variant,
  showCloseButton = true,
  closeButtonVariant = "ghost",
  overlayBlur = "lg",
  ...props 
}, ref) => (
  <DialogPortal>
    <DialogOverlay blur={overlayBlur} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        dialogContentVariants({ size, variant }),
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close 
          className={cn(
            "absolute top-4 right-4",
            "vm-focus-ring transition-all duration-fast",
            "rounded-md p-1",
            // Variant styles
            closeButtonVariant === "default" && "bg-surface hover:bg-surface-elevated text-muted hover:text-foreground",
            closeButtonVariant === "ghost" && "bg-transparent hover:bg-surface text-muted hover:text-foreground",
            closeButtonVariant === "outline" && "bg-transparent border border-border hover:bg-surface text-muted hover:text-foreground",
            // Disabled state
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * Dialog header with alignment options
 */
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: "left" | "center" | "right"
  spacing?: "tight" | "normal" | "loose"
}

const DialogHeader = ({
  className,
  alignment = "left",
  spacing = "normal",
  ...props
}: DialogHeaderProps) => (
  <div
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
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

/**
 * Dialog footer with layout options
 */
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: "start" | "center" | "end" | "between"
  direction?: "row" | "col" | "responsive"
  spacing?: "tight" | "normal" | "loose"
}

const DialogFooter = ({
  className,
  justify = "end",
  direction = "responsive",
  spacing = "normal",
  ...props
}: DialogFooterProps) => (
  <div
    className={cn(
      "flex",
      // Direction
      direction === "row" && "flex-row",
      direction === "col" && "flex-col",
      direction === "responsive" && "flex-col-reverse sm:flex-row",
      // Justify
      justify === "start" && "justify-start",
      justify === "center" && "justify-center", 
      justify === "end" && "justify-end sm:justify-end",
      justify === "between" && "justify-between",
      // Spacing
      spacing === "tight" && (direction === "responsive" ? "space-y-1 sm:space-y-0 sm:space-x-1" : direction === "row" ? "space-x-1" : "space-y-1"),
      spacing === "normal" && (direction === "responsive" ? "space-y-2 sm:space-y-0 sm:space-x-2" : direction === "row" ? "space-x-2" : "space-y-2"),
      spacing === "loose" && (direction === "responsive" ? "space-y-4 sm:space-y-0 sm:space-x-4" : direction === "row" ? "space-x-4" : "space-y-4"),
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

/**
 * Dialog title with size variants
 */
interface DialogTitleProps 
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  size?: "sm" | "md" | "lg"
  gradient?: boolean
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  DialogTitleProps
>(({ className, size = "md", gradient = false, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "font-semibold leading-tight tracking-tight",
      // Size variants using design system typography
      size === "sm" && "vm-text-lg",
      size === "md" && "vm-text-xl", 
      size === "lg" && "vm-text-2xl",
      // Gradient text
      gradient && "vm-gradient-text",
      // Default color
      !gradient && "text-foreground",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Dialog description with size variants
 */
interface DialogDescriptionProps 
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> {
  size?: "sm" | "md" | "lg"
  muted?: boolean
}

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  DialogDescriptionProps
>(({ className, size = "md", muted = true, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "leading-relaxed",
      // Size variants
      size === "sm" && "vm-text-sm",
      size === "md" && "vm-text-base",
      size === "lg" && "vm-text-lg",
      // Color variants
      muted ? "text-muted" : "text-foreground",
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/**
 * Specialized dialog variants for common use cases
 */

// Confirmation Dialog
export interface ConfirmationDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: "default" | "destructive"
  loading?: boolean
}

export const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: ConfirmationDialogProps) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else if (onOpenChange) {
      onOpenChange(false)
    }
  }

  const handleConfirm = () => {
    onConfirm()
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="sm" 
        variant={variant === "destructive" ? "destructive" : "default"}
      >
        <DialogHeader>
          <DialogTitle size="md">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={handleCancel}
            className="vm-button vm-button-secondary px-4 py-2"
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              "vm-button px-4 py-2",
              variant === "destructive" ? "bg-destructive text-destructive-foreground" : "vm-button-primary"
            )}
            disabled={loading}
          >
            {loading ? "Loading..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Alert Dialog
export interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: string
  actionLabel?: string
  variant?: "default" | "destructive" | "warning"
}

export const AlertDialog = ({
  open,
  onOpenChange,
  title,
  description,
  actionLabel = "OK",
  variant = "default",
}: AlertDialogProps) => {
  const handleAction = () => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        size="sm" 
        variant={variant === "destructive" ? "destructive" : "default"}
      >
        <DialogHeader>
          <DialogTitle size="md">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter justify="center">
          <button
            onClick={handleAction}
            className={cn(
              "vm-button px-6 py-2",
              variant === "destructive" && "bg-destructive text-destructive-foreground",
              variant === "warning" && "bg-warning text-warning-foreground",
              variant === "default" && "vm-button-primary"
            )}
          >
            {actionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
}
export type {
  DialogContentProps,
  DialogHeaderProps,
  DialogFooterProps,
  DialogTitleProps,
  DialogDescriptionProps,
}