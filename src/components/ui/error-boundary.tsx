"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { AlertTriangle, RefreshCw, Home, Bug, ChevronRight } from "lucide-react"
import { Button } from "./button"
import { Card } from "./card"

/**
 * Enhanced Error Boundary component variants
 * Professional error handling with recovery options
 */
const errorBoundaryVariants = cva(
  [
    "flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
    "bg-[var(--vm-color-surface)] rounded-lg border border-[var(--vm-color-border)]",
  ],
  {
    variants: {
      severity: {
        low: "border-[var(--vm-color-border)] bg-[var(--vm-color-surface)]",
        medium: "border-[var(--vm-warning-200)] bg-[var(--vm-warning-50)]/20",
        high: "border-[var(--vm-error-200)] bg-[var(--vm-error-50)]/20",
        critical: "border-[var(--vm-error-500)] bg-[var(--vm-error-50)]/30",
      },
      size: {
        sm: "min-h-[200px] p-4",
        md: "min-h-[400px] p-8",
        lg: "min-h-[600px] p-12",
      },
    },
    defaultVariants: {
      severity: "medium",
      size: "md",
    },
  }
)

export interface ErrorInfo {
  error?: Error
  errorInfo?: React.ErrorInfo
  severity?: "low" | "medium" | "high" | "critical"
  title?: string
  description?: string
  suggestion?: string
  errorCode?: string
  timestamp?: Date
}

export interface ErrorFallbackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorBoundaryVariants> {
  error?: Error
  errorInfo?: React.ErrorInfo
  resetError?: () => void
  onReport?: (error: Error, errorInfo?: React.ErrorInfo) => void
  showDetails?: boolean
  showReport?: boolean
  customActions?: React.ReactNode
}

/**
 * Error severity icons
 */
const severityIcons = {
  low: AlertTriangle,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: Bug,
} as const

/**
 * Get error severity based on error type
 */
function getErrorSeverity(error?: Error): "low" | "medium" | "high" | "critical" {
  if (!error) return "medium"
  
  const message = error.message.toLowerCase()
  
  if (message.includes("network") || message.includes("fetch")) return "low"
  if (message.includes("chunk") || message.includes("loading")) return "medium"
  if (message.includes("permission") || message.includes("auth")) return "high"
  if (message.includes("critical") || message.includes("fatal")) return "critical"
  
  return "medium"
}

/**
 * Get user-friendly error messages
 */
function getErrorMessages(error?: Error) {
  if (!error) {
    return {
      title: "Something went wrong",
      description: "An unexpected error occurred. Please try again.",
      suggestion: "If the problem persists, try refreshing the page or contact support.",
    }
  }

  const message = error.message.toLowerCase()

  if (message.includes("network") || message.includes("fetch")) {
    return {
      title: "Connection Error",
      description: "Unable to connect to our servers. Please check your internet connection.",
      suggestion: "Try refreshing the page or check your network settings.",
    }
  }

  if (message.includes("chunk") || message.includes("loading")) {
    return {
      title: "Loading Error",
      description: "Failed to load part of the application.",
      suggestion: "Please refresh the page to reload the missing components.",
    }
  }

  if (message.includes("permission") || message.includes("auth")) {
    return {
      title: "Access Denied",
      description: "You don't have permission to access this resource.",
      suggestion: "Please log in again or contact your administrator.",
    }
  }

  return {
    title: "Unexpected Error",
    description: error.message || "An unexpected error occurred.",
    suggestion: "Please try again or contact support if the problem persists.",
  }
}

/**
 * Error Fallback Component
 */
const ErrorFallback = React.forwardRef<HTMLDivElement, ErrorFallbackProps>(
  ({
    className,
    severity,
    size,
    error,
    errorInfo,
    resetError,
    onReport,
    showDetails = false,
    showReport = true,
    customActions,
    ...props
  }, ref) => {
    const [showErrorDetails, setShowErrorDetails] = React.useState(showDetails)
    const [isReporting, setIsReporting] = React.useState(false)

    const errorSeverity = severity || getErrorSeverity(error)
    const { title, description, suggestion } = getErrorMessages(error)
    const Icon = severityIcons[errorSeverity]

    const handleReport = async () => {
      if (!onReport || !error) return
      
      setIsReporting(true)
      try {
        await onReport(error, errorInfo)
      } finally {
        setIsReporting(false)
      }
    }

    const handleRefresh = () => {
      window.location.reload()
    }

    const handleGoHome = () => {
      window.location.href = "/"
    }

    return (
      <motion.div
        ref={ref}
        className={cn(errorBoundaryVariants({ severity: errorSeverity, size }), className)}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        {...props}
      >
        {/* Error Icon */}
        <motion.div
          className={cn(
            "mb-6 rounded-full p-4",
            {
              "bg-[var(--vm-neutral-100)] text-[var(--vm-neutral-600)]": errorSeverity === "low",
              "bg-[var(--vm-warning-100)] text-[var(--vm-warning-600)]": errorSeverity === "medium",
              "bg-[var(--vm-error-100)] text-[var(--vm-error-600)]": errorSeverity === "high",
              "bg-[var(--vm-error-200)] text-[var(--vm-error-700)]": errorSeverity === "critical",
            }
          )}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Icon size={48} />
        </motion.div>

        {/* Error Message */}
        <div className="mb-6 space-y-3">
          <motion.h2
            className="text-2xl font-bold text-[var(--vm-color-foreground)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.h2>
          
          <motion.p
            className="text-[var(--vm-color-muted)] max-w-md mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {description}
          </motion.p>
          
          {suggestion && (
            <motion.p
              className="text-sm text-[var(--vm-color-muted)] max-w-lg mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {suggestion}
            </motion.p>
          )}
        </div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {resetError && (
            <Button
              onClick={resetError}
              variant="primary"
              leftIcon={<RefreshCw size={16} />}
            >
              Try Again
            </Button>
          )}
          
          <Button
            onClick={handleRefresh}
            variant="secondary"
            leftIcon={<RefreshCw size={16} />}
          >
            Refresh Page
          </Button>
          
          <Button
            onClick={handleGoHome}
            variant="ghost"
            leftIcon={<Home size={16} />}
          >
            Go Home
          </Button>

          {customActions}
        </motion.div>

        {/* Additional Actions */}
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          {/* Error Details Toggle */}
          {error && (
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="flex items-center gap-1 text-[var(--vm-color-muted)] hover:text-[var(--vm-color-foreground)] transition-colors"
            >
              <span>Error Details</span>
              <ChevronRight
                size={14}
                className={cn(
                  "transition-transform",
                  showErrorDetails && "rotate-90"
                )}
              />
            </button>
          )}

          {/* Report Error */}
          {showReport && onReport && (
            <Button
              onClick={handleReport}
              variant="ghost"
              size="sm"
              loading={isReporting}
              leftIcon={<Bug size={14} />}
            >
              Report Issue
            </Button>
          )}
        </div>

        {/* Error Details */}
        {showErrorDetails && error && (
          <motion.div
            className="mt-6 w-full max-w-2xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="outline" className="p-4 text-left">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-[var(--vm-color-foreground)] mb-1">
                    Error Message
                  </h4>
                  <code className="text-xs text-[var(--vm-color-muted)] bg-[var(--vm-color-surface-elevated)] p-2 rounded block">
                    {error.message}
                  </code>
                </div>
                
                {error.stack && (
                  <div>
                    <h4 className="font-medium text-[var(--vm-color-foreground)] mb-1">
                      Stack Trace
                    </h4>
                    <pre className="text-xs text-[var(--vm-color-muted)] bg-[var(--vm-color-surface-elevated)] p-2 rounded overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}
                
                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="font-medium text-[var(--vm-color-foreground)] mb-1">
                      Component Stack
                    </h4>
                    <pre className="text-xs text-[var(--vm-color-muted)] bg-[var(--vm-color-surface-elevated)] p-2 rounded overflow-auto max-h-40">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    )
  }
)

ErrorFallback.displayName = "ErrorFallback"

/**
 * Error Boundary Class Component
 */
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReport?: (error: Error, errorInfo?: React.ErrorInfo) => void
  showDetails?: boolean
  showReport?: boolean
  customActions?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })
    
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          onReport={this.props.onReport}
          showDetails={this.props.showDetails}
          showReport={this.props.showReport}
          customActions={this.props.customActions}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Error Boundary Hook (for functional components)
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    // In a real app, you might want to report this to an error reporting service
    console.error("Error caught by error handler:", error)
    if (errorInfo) {
      console.error("Error info:", errorInfo)
    }
    
    // You could trigger a toast notification here
    // toast.error("An error occurred", { description: error.message })
  }
}

export { ErrorFallback, errorBoundaryVariants }
export type { ErrorFallbackProps, ErrorBoundaryProps, ErrorInfo }