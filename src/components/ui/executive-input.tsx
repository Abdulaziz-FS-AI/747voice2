/**
 * Executive Input Components
 * Voice Matrix Professional Design System v7.0
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, Check, AlertTriangle, X, Search } from "lucide-react"

/**
 * Executive Input variants
 */
const inputVariants = cva(
  [
    // Executive base styles
    "vm-focus-executive theme-transition",
    "w-full font-medium",
    "transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)",
    "font-family: var(--vm-font-primary)",
    "placeholder:text-[oklch(0.7500_0.0300_235)]",
  ],
  {
    variants: {
      variant: {
        default: [
          // Executive Default Input
          "bg-[oklch(0.2200_0.0500_245)]",
          "border border-[oklch(0.4000_0.0500_245)]",
          "text-[oklch(0.9800_0.0200_230)]",
          "focus:border-[oklch(0.6000_0.1800_45)]",
          "focus:shadow-[0_0_0_3px_oklch(0.4800_0.2100_220_/_0.1)]",
          "focus:bg-[oklch(0.1800_0.0450_240)]",
        ],
        glass: [
          // Executive Glass Input
          "bg-[oklch(0.1600_0.0450_240_/_0.90)] backdrop-blur-[16px]",
          "border border-[oklch(0.4000_0.0600_245_/_0.8)]",
          "text-[oklch(0.9800_0.0200_230)]",
          "focus:border-[oklch(0.6000_0.1800_45_/_0.9)]",
          "focus:shadow-[0_0_0_3px_oklch(0.6000_0.1800_45_/_0.1)]",
          "focus:bg-[oklch(0.1600_0.0450_240_/_0.95)]",
        ],
        premium: [
          // Executive Premium Input - Gold Accent
          "bg-[oklch(0.1800_0.0450_240)]",
          "border border-[oklch(0.6489_0.2370_26.9728_/_0.3)]",
          "text-[oklch(0.9800_0.0200_230)]",
          "focus:border-[oklch(0.6489_0.2370_26.9728)]",
          "focus:shadow-[0_0_0_3px_oklch(0.6489_0.2370_26.9728_/_0.1)]",
          "focus:bg-[oklch(0.2200_0.0500_245)]",
        ],
      },
      size: {
        sm: [
          "h-9 px-3 text-sm",
          "rounded-[6px]",
        ],
        md: [
          "h-11 px-4 text-sm", 
          "rounded-[10px]",
        ],
        lg: [
          "h-13 px-5 text-base",
          "rounded-[14px]",
        ],
      },
      state: {
        default: "",
        error: [
          "border-[oklch(0.5500_0.2000_25)] focus:border-[oklch(0.5500_0.2000_25)]",
          "focus:shadow-[0_0_0_3px_oklch(0.5500_0.2000_25_/_0.1)]",
        ],
        success: [
          "border-[oklch(0.6800_0.1500_142)] focus:border-[oklch(0.6800_0.1500_142)]",
          "focus:shadow-[0_0_0_3px_oklch(0.6800_0.1500_142_/_0.1)]",
        ],
        warning: [
          "border-[oklch(0.7800_0.1400_85)] focus:border-[oklch(0.7800_0.1400_85)]",
          "focus:shadow-[0_0_0_3px_oklch(0.7800_0.1400_85_/_0.1)]",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      state: "default",
    },
  }
)

export interface ExecutiveInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
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
}

/**
 * Executive Input Component
 */
const ExecutiveInput = React.forwardRef<HTMLInputElement, ExecutiveInputProps>(
  ({
    className,
    variant,
    size,
    state,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    leftIcon,
    rightIcon,
    showPasswordToggle,
    floating = false,
    type = "text",
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)

    // Determine validation state
    const validationState = errorText ? "error" : 
                           successText ? "success" : 
                           warningText ? "warning" : "default"

    const finalState = state || validationState

    // Handle password toggle
    const inputType = showPasswordToggle && type === "password" 
      ? (showPassword ? "text" : "password") 
      : type

    // Password toggle icon
    const PasswordToggle = showPassword ? EyeOff : Eye

    // Validation icons
    const validationIcons = {
      error: X,
      success: Check,
      warning: AlertTriangle,
      default: null,
    }

    const ValidationIcon = validationIcons[finalState as keyof typeof validationIcons]

    // Handle value changes for floating labels
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      props.onChange?.(e)
    }

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && !floating && (
          <label className="block text-sm font-medium text-[oklch(0.9800_0.0200_230)]">
            {label}
            {props.required && <span className="text-[oklch(0.5500_0.2000_25)] ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Floating Label */}
          {floating && label && (
            <motion.label
              className={cn(
                "absolute left-4 text-sm font-medium pointer-events-none",
                "transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1)",
                (isFocused || hasValue) 
                  ? "top-2 text-xs text-[oklch(0.6000_0.1800_45)]" 
                  : "top-1/2 -translate-y-1/2 text-[oklch(0.7500_0.0300_235)]"
              )}
              animate={{
                scale: (isFocused || hasValue) ? 0.85 : 1,
              }}
            >
              {label}
              {props.required && <span className="text-[oklch(0.5500_0.2000_25)] ml-1">*</span>}
            </motion.label>
          )}

          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.7500_0.0300_235)]">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={inputType}
            className={cn(
              inputVariants({ variant, size, state: finalState }),
              leftIcon && "pl-10",
              (rightIcon || showPasswordToggle || ValidationIcon) && "pr-10",
              floating && label && "pt-6 pb-2",
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={handleChange}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
            {/* Validation Icon */}
            {ValidationIcon && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "w-4 h-4",
                  finalState === "error" && "text-[oklch(0.5500_0.2000_25)]",
                  finalState === "success" && "text-[oklch(0.6800_0.1500_142)]",
                  finalState === "warning" && "text-[oklch(0.7800_0.1400_85)]"
                )}
              >
                <ValidationIcon size={16} />
              </motion.div>
            )}

            {/* Password Toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[oklch(0.7500_0.0300_235)] hover:text-[oklch(0.9800_0.0200_230)] transition-colors"
              >
                <PasswordToggle size={16} />
              </button>
            )}

            {/* Custom Right Icon */}
            {rightIcon && !ValidationIcon && (
              <div className="text-[oklch(0.7500_0.0300_235)]">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Helper/Error Text */}
        <AnimatePresence>
          {(helperText || errorText || successText || warningText) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "text-xs flex items-center gap-1",
                finalState === "error" && "text-[oklch(0.5500_0.2000_25)]",
                finalState === "success" && "text-[oklch(0.6800_0.1500_142)]",
                finalState === "warning" && "text-[oklch(0.7800_0.1400_85)]",
                finalState === "default" && "text-[oklch(0.7500_0.0300_235)]"
              )}
            >
              {errorText || successText || warningText || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

ExecutiveInput.displayName = "ExecutiveInput"

/**
 * Executive Search Input Component
 */
export interface ExecutiveSearchInputProps extends ExecutiveInputProps {
  onSearch?: (value: string) => void
  searchDelay?: number
}

const ExecutiveSearchInput = React.forwardRef<HTMLInputElement, ExecutiveSearchInputProps>(
  ({ onSearch, searchDelay = 300, ...props }, ref) => {
    const [searchValue, setSearchValue] = React.useState("")
    const timeoutRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (searchValue && onSearch) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          onSearch(searchValue)
        }, searchDelay)
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [searchValue, onSearch, searchDelay])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value)
      props.onChange?.(e)
    }

    return (
      <ExecutiveInput
        ref={ref}
        type="search"
        leftIcon={<Search size={16} />}
        placeholder="Search..."
        {...props}
        onChange={handleChange}
      />
    )
  }
)

ExecutiveSearchInput.displayName = "ExecutiveSearchInput"

/**
 * Executive Textarea Component
 */
export interface ExecutiveTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Pick<VariantProps<typeof inputVariants>, "variant" | "state"> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  warningText?: string
  resize?: "none" | "vertical" | "horizontal" | "both"
}

const ExecutiveTextarea = React.forwardRef<HTMLTextAreaElement, ExecutiveTextareaProps>(
  ({
    className,
    variant = "default",
    state,
    label,
    helperText,
    errorText,
    successText,
    warningText,
    resize = "vertical",
    ...props
  }, ref) => {
    // Determine validation state
    const validationState = errorText ? "error" : 
                           successText ? "success" : 
                           warningText ? "warning" : "default"

    const finalState = state || validationState

    // Validation icons
    const validationIcons = {
      error: X,
      success: Check,
      warning: AlertTriangle,
      default: null,
    }

    const ValidationIcon = validationIcons[finalState as keyof typeof validationIcons]

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-[oklch(0.9800_0.0200_230)]">
            {label}
            {props.required && <span className="text-[oklch(0.5500_0.2000_25)] ml-1">*</span>}
          </label>
        )}

        {/* Textarea Container */}
        <div className="relative">
          <textarea
            ref={ref}
            className={cn(
              // Base textarea styles using input variants
              inputVariants({ variant, state: finalState }).replace("h-11", "min-h-[88px]"),
              ValidationIcon && "pr-10",
              resize === "none" && "resize-none",
              resize === "vertical" && "resize-y",
              resize === "horizontal" && "resize-x",
              resize === "both" && "resize",
              className
            )}
            {...props}
          />

          {/* Validation Icon */}
          {ValidationIcon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "absolute right-3 top-3 w-4 h-4",
                finalState === "error" && "text-[oklch(0.5500_0.2000_25)]",
                finalState === "success" && "text-[oklch(0.6800_0.1500_142)]",
                finalState === "warning" && "text-[oklch(0.7800_0.1400_85)]"
              )}
            >
              <ValidationIcon size={16} />
            </motion.div>
          )}
        </div>

        {/* Helper/Error Text */}
        <AnimatePresence>
          {(helperText || errorText || successText || warningText) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "text-xs flex items-center gap-1",
                finalState === "error" && "text-[oklch(0.5500_0.2000_25)]",
                finalState === "success" && "text-[oklch(0.6800_0.1500_142)]",
                finalState === "warning" && "text-[oklch(0.7800_0.1400_85)]",
                finalState === "default" && "text-[oklch(0.7500_0.0300_235)]"
              )}
            >
              {errorText || successText || warningText || helperText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

ExecutiveTextarea.displayName = "ExecutiveTextarea"

export { ExecutiveInput, ExecutiveSearchInput, ExecutiveTextarea, inputVariants }
export type { ExecutiveInputProps, ExecutiveSearchInputProps, ExecutiveTextareaProps }