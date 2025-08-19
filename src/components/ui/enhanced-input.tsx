"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority" 
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Check, X, AlertCircle, Info } from "lucide-react"

/**
 * Enhanced Input component variants
 * Modern form input with floating labels, validation states, and icons
 */
const inputVariants = cva(
  [
    "flex w-full rounded-lg border bg-transparent px-3 py-2",
    "text-base transition-all duration-200 ease-out",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-[var(--vm-color-muted)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "autofill:bg-transparent",
  ],
  {
    variants: {
      variant: {
        default: [
          "border-[var(--vm-color-border)]",
          "focus-visible:border-[var(--vm-color-primary)]",
          "focus-visible:ring-[var(--vm-color-focus-ring)]",
        ],
        success: [
          "border-[var(--vm-color-success)]",
          "focus-visible:border-[var(--vm-color-success)]",
          "focus-visible:ring-green-100",
        ],
        error: [
          "border-[var(--vm-color-error)]",
          "focus-visible:border-[var(--vm-color-error)]", 
          "focus-visible:ring-red-100",
        ],
        warning: [
          "border-[var(--vm-color-warning)]",
          "focus-visible:border-[var(--vm-color-warning)]",
          "focus-visible:ring-yellow-100",
        ],
      },
      size: {
        sm: "h-8 px-2 text-xs",
        md: "h-10 px-3 text-sm", 
        lg: "h-12 px-4 text-base",
      },
      hasIcon: {
        true: "pr-10",
        left: "pl-10",
        both: "px-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

const labelVariants = cva(
  [
    "absolute left-3 transition-all duration-200 ease-out pointer-events-none",
    "text-[var(--vm-color-muted)]",
  ],
  {
    variants: {
      floating: {
        true: "top-2 text-xs bg-[var(--vm-color-surface)] px-1 -translate-y-4",
        false: "top-1/2 -translate-y-1/2 text-sm",
      },
      variant: {
        default: "",
        success: "text-[var(--vm-color-success)]",
        error: "text-[var(--vm-color-error)]",
        warning: "text-[var(--vm-color-warning)]",
      },
    },
    defaultVariants: {
      floating: false,
      variant: "default",
    },
  }
)

export interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
  floating?: boolean
  required?: boolean
}

/**
 * Enhanced Input with floating labels and validation states
 */
const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({
    className,
    variant = "default",
    size = "md", 
    type = "text",
    label,
    helperText,
    errorText,
    successText,
    warningText,
    leftIcon,
    rightIcon,
    showPasswordToggle = false,
    floating = false,
    required = false,
    disabled,
    value,
    ...props
  }, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(Boolean(value))

    const isPassword = type === "password" || showPasswordToggle
    const inputType = isPassword && isPasswordVisible ? "text" : type

    // Determine validation state
    const validationState = errorText ? "error" : 
                          successText ? "success" :
                          warningText ? "warning" : "default"

    const currentVariant = validationState !== "default" ? validationState : variant

    // Determine icon configuration
    const hasIcon = leftIcon || rightIcon || isPassword ? 
                   leftIcon && (rightIcon || isPassword) ? "both" :
                   leftIcon ? "left" : "true" : undefined

    // Handle floating label
    const shouldFloat = floating && (isFocused || hasValue || Boolean(props.placeholder))

    // Validation message to show
    const validationMessage = errorText || warningText || successText || helperText

    // Validation icon
    const ValidationIcon = errorText ? X : 
                          successText ? Check : 
                          warningText ? AlertCircle :
                          helperText ? Info : null

    React.useEffect(() => {
      setHasValue(Boolean(value))
    }, [value])

    const togglePasswordVisibility = () => {
      setIsPasswordVisible(!isPasswordVisible)
    }

    return (
      <div className="relative">
        {/* Floating Label */}
        {label && (
          <label
            className={cn(
              labelVariants({ 
                floating: shouldFloat, 
                variant: currentVariant === "default" ? undefined : currentVariant 
              })
            )}
            htmlFor={props.id}
          >
            {label}
            {required && <span className="ml-1 text-[var(--vm-color-error)]">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vm-color-muted)]">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: currentVariant, size, hasIcon }),
              className
            )}
            ref={ref}
            disabled={disabled}
            value={value}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              setHasValue(Boolean(e.target.value))
              props.onBlur?.(e)
            }}
            onChange={(e) => {
              setHasValue(Boolean(e.target.value))
              props.onChange?.(e)
            }}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {rightIcon && (
              <div className="text-[var(--vm-color-muted)]">
                {rightIcon}
              </div>
            )}

            {/* Password Toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-[var(--vm-color-muted)] hover:text-[var(--vm-color-foreground)] transition-colors"
                tabIndex={-1}
              >
                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Validation Message */}
        <AnimatePresence mode="wait">
          {validationMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-center gap-2 mt-1 px-1 text-xs",
                {
                  "text-[var(--vm-color-error)]": errorText,
                  "text-[var(--vm-color-success)]": successText,
                  "text-[var(--vm-color-warning)]": warningText,
                  "text-[var(--vm-color-muted)]": helperText && !errorText && !successText && !warningText,
                }
              )}
            >
              {ValidationIcon && <ValidationIcon size={12} />}
              <span>{validationMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

EnhancedInput.displayName = "EnhancedInput"

/**
 * Input Group for multiple related inputs
 */
export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  spacing?: "tight" | "normal" | "loose"
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, orientation = "vertical", spacing = "normal", children, ...props }, ref) => {
    const spacingClasses = {
      tight: orientation === "vertical" ? "space-y-2" : "space-x-2",
      normal: orientation === "vertical" ? "space-y-4" : "space-x-4", 
      loose: orientation === "vertical" ? "space-y-6" : "space-x-6",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "vertical" ? "flex-col" : "flex-row items-end",
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

InputGroup.displayName = "InputGroup"

/**
 * Search Input with built-in search functionality
 */
export interface SearchInputProps extends Omit<EnhancedInputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  debounceMs?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    onSearch, 
    onClear, 
    debounceMs = 300, 
    value: controlledValue,
    onChange,
    ...props 
  }, ref) => {
    const [value, setValue] = React.useState(controlledValue || "")
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue as string)
      }
    }, [controlledValue])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      onChange?.(e)

      // Debounce search
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        onSearch?.(newValue)
      }, debounceMs)
    }

    const handleClear = () => {
      setValue("")
      onClear?.()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    return (
      <EnhancedInput
        ref={ref}
        type="search"
        value={value}
        onChange={handleChange}
        leftIcon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        }
        rightIcon={value && (
          <button
            type="button"
            onClick={handleClear}
            className="hover:text-[var(--vm-color-foreground)] transition-colors"
          >
            <X size={16} />
          </button>
        )}
        {...props}
      />
    )
  }
)

SearchInput.displayName = "SearchInput"

export { EnhancedInput, InputGroup, SearchInput, inputVariants, labelVariants }
export type { EnhancedInputProps, InputGroupProps, SearchInputProps }