import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

/**
 * Input component variants using CVA
 * Integrated with Voice Matrix unified design system
 */
const inputVariants = cva(
  [
    // Voice Matrix Base styles using unified design system
    "vm-input vm-focus-ring theme-transition",
    "flex w-full border",
    "bg-[var(--vm-color-surface-elevated)] px-4 py-2 text-[var(--vm-text-sm)] text-[var(--vm-color-foreground)]",
    "border-[var(--vm-color-border)]",
    "font-family: var(--vm-font-body)",
    "transition-all var(--vm-duration-fast) var(--vm-ease-out)",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-[var(--vm-color-muted)]",
    "focus:border-[var(--vm-color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--vm-color-ring)]/20",
    "focus:bg-[var(--vm-color-surface)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "autofill:shadow-[inset_0_0_0px_1000px_var(--vm-color-surface)]",
  ],
  {
    variants: {
      size: {
        sm: [
          "vm-input-sm",
          "h-9 px-3 py-1.5 text-[var(--vm-text-xs)]",
          "rounded-[var(--vm-radius-md)]",
        ],
        md: [
          "vm-input-md",
          "h-11 px-4 py-2 text-[var(--vm-text-sm)]",
          "rounded-[var(--vm-radius-lg)]",
        ],
        lg: [
          "vm-input-lg",
          "h-13 px-5 py-3 text-[var(--vm-text-base)]",
          "rounded-[var(--vm-radius-lg)]",
        ],
      },
      variant: {
        default: [
          "border-[var(--vm-color-border)] bg-[var(--vm-color-surface-elevated)]",
          "focus:border-[var(--vm-color-ring)]",
        ],
        filled: [
          "border-transparent bg-[var(--vm-color-surface-elevated)]",
          "focus:border-[var(--vm-color-ring)] focus:bg-[var(--vm-color-surface)]",
        ],
        outline: [
          "border-2 border-[var(--vm-color-border)] bg-transparent",
          "focus:border-[var(--vm-color-ring)] focus:bg-[var(--vm-color-surface)]/50",
        ],
        ghost: [
          "border-transparent bg-transparent",
          "focus:border-[var(--vm-color-ring)] focus:bg-[var(--vm-color-surface)]",
        ],
      },
      state: {
        error: [
          "vm-input-error",
          "border-[var(--vm-color-destructive)] focus:border-[var(--vm-color-destructive)]",
          "focus:ring-[var(--vm-color-destructive)]/20",
        ],
        success: [
          "vm-input-success",
          "border-[var(--vm-color-success)] focus:border-[var(--vm-color-success)]",
          "focus:ring-[var(--vm-color-success)]/20", 
        ],
        warning: [
          "border-[var(--vm-color-warning)] focus:border-[var(--vm-color-warning)]",
          "focus:ring-[var(--vm-color-warning)]/20",
        ],
      },
    },
    compoundVariants: [
      // Theme-specific compound variants
      {
        variant: "outline",
        className: [
          "data-[theme=brutalist]:border-2 data-[theme=brutalist]:border-foreground",
          "data-[theme=brutalist]:rounded-none data-[theme=brutalist]:bg-transparent",
          "data-[theme=brutalist]:focus:border-foreground data-[theme=brutalist]:focus:shadow-[4px_4px_0px_0px_currentColor]",
        ],
      },
      {
        variant: "filled",
        className: [
          "data-[theme=premium-dark]:bg-gradient-surface data-[theme=premium-dark]:border-border-subtle",
          "data-[theme=premium-dark]:backdrop-blur-xl",
        ],
      },
      {
        size: "sm",
        state: "error",
        className: "pr-8",
      },
      {
        size: ["md", "lg"],
        state: "error", 
        className: "pr-10",
      },
    ],
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
  success?: string
  warning?: string
  label?: string
  description?: string
  required?: boolean
  motionProps?: Omit<HTMLMotionProps<"input">, keyof React.InputHTMLAttributes<HTMLInputElement>>
}

/**
 * Input field component with enhanced features
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    type = "text",
    size,
    variant,
    state,
    leftIcon,
    rightIcon,
    error,
    success,
    warning,
    label,
    description,
    required,
    disabled,
    motionProps,
    id,
    ...props
  }, ref) => {
    // Determine state from props
    const derivedState = state || (error ? "error" : success ? "success" : warning ? "warning" : undefined)
    
    // Generate unique id if not provided
    const inputId = id || React.useId()
    const descriptionId = description ? `${inputId}-description` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    // Status message to display
    const statusMessage = error || success || warning
    const statusIcon = derivedState === "error" ? "⚠️" : derivedState === "success" ? "✓" : derivedState === "warning" ? "⚠️" : null

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-foreground mb-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <motion.input
            ref={ref}
            type={type}
            id={inputId}
            disabled={disabled}
            aria-describedby={cn(descriptionId, errorId)}
            aria-invalid={derivedState === "error"}
            className={cn(
              inputVariants({ size, variant, state: derivedState }),
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              derivedState && statusIcon && (size === "sm" ? "pr-8" : "pr-10"),
              className
            )}
            {...motionProps}
            {...props}
          />

          {/* Right Icon or Status Icon */}
          {(rightIcon || statusIcon) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {statusIcon || rightIcon}
            </div>
          )}
        </div>

        {/* Description */}
        {description && !statusMessage && (
          <p id={descriptionId} className="mt-2 text-xs text-muted">
            {description}
          </p>
        )}

        {/* Status Message */}
        {statusMessage && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mt-2 text-xs flex items-center gap-1",
              derivedState === "error" && "text-destructive",
              derivedState === "success" && "text-success",
              derivedState === "warning" && "text-warning"
            )}
          >
            {statusIcon && <span>{statusIcon}</span>}
            {statusMessage}
          </motion.p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

/**
 * Textarea component with similar styling
 */
interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    Pick<InputProps, 'size' | 'variant' | 'state' | 'label' | 'description' | 'error' | 'success' | 'warning'> {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    size,
    variant,
    state,
    label,
    description,
    error,
    success,
    warning,
    required,
    disabled,
    resize = 'vertical',
    autoResize = false,
    id,
    ...props
  }, ref) => {
    const derivedState = state || (error ? "error" : success ? "success" : warning ? "warning" : undefined)
    const inputId = id || React.useId()
    const descriptionId = description ? `${inputId}-description` : undefined
    const errorId = error ? `${inputId}-error` : undefined
    const statusMessage = error || success || warning

    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    React.useImperativeHandle(ref, () => textareaRef.current!)

    // Auto-resize functionality
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current
        textarea.style.height = 'auto'
        textarea.style.height = `${textarea.scrollHeight}px`
      }
    }, [autoResize, props.value])

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              "block text-sm font-medium text-foreground mb-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <motion.textarea
          ref={textareaRef}
          id={inputId}
          disabled={disabled}
          aria-describedby={cn(descriptionId, errorId)}
          aria-invalid={derivedState === "error"}
          className={cn(
            inputVariants({ size, variant, state: derivedState }),
            "min-h-[80px]",
            resize === 'none' && "resize-none",
            resize === 'vertical' && "resize-y",
            resize === 'horizontal' && "resize-x",
            resize === 'both' && "resize",
            className
          )}
          {...props}
        />

        {description && !statusMessage && (
          <p id={descriptionId} className="mt-2 text-xs text-muted">
            {description}
          </p>
        )}

        {statusMessage && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "mt-2 text-xs",
              derivedState === "error" && "text-destructive",
              derivedState === "success" && "text-success",
              derivedState === "warning" && "text-warning"
            )}
          >
            {statusMessage}
          </motion.p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

/**
 * Input group for combining inputs with buttons/icons
 */
interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: VariantProps<typeof inputVariants>["size"]
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full overflow-hidden rounded-lg border border-border",
          "focus-within:ring-2 focus-within:ring-ring/20",
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            // If it's an Input component, remove its border and border radius
            if (child.type === Input) {
              return React.cloneElement(child, {
                size: child.props.size || size,
                className: cn(
                  child.props.className,
                  "border-0 rounded-none focus:ring-0 flex-1"
                )
              })
            }
            // If it's a Button, adjust styling
            if (child.props?.asChild || typeof child.type === 'function') {
              return React.cloneElement(child, {
                className: cn(
                  child.props.className,
                  "rounded-none border-0",
                  index === 0 && "border-r border-border",
                  index === React.Children.count(children) - 1 && "border-l border-border"
                )
              })
            }
          }
          return child
        })}
      </div>
    )
  }
)

InputGroup.displayName = "InputGroup"

export { Input, Textarea, InputGroup, inputVariants }
export type { InputProps, TextareaProps, InputGroupProps }