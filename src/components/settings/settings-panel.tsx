"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Globe,
  CreditCard,
  Key,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Info,
  Save,
  RotateCcw
} from "lucide-react"
import { Card } from "../ui/card"
import { Button } from "../ui/button"
import { EnhancedInput } from "../ui/enhanced-input"
import { LoadingSpinner } from "../ui/loading-spinner"

/**
 * Modern Settings Panel variants
 * Professional settings interface for SaaS applications
 */
const settingsPanelVariants = cva(
  [
    "w-full max-w-4xl mx-auto space-y-6",
  ],
  {
    variants: {
      layout: {
        default: "",
        tabs: "space-y-0",
        sidebar: "flex gap-6",
      },
    },
    defaultVariants: {
      layout: "default",
    },
  }
)

export interface SettingsPanelProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof settingsPanelVariants> {
  children: React.ReactNode
  loading?: boolean
  onSave?: (data: any) => Promise<void>
  onReset?: () => void
  hasUnsavedChanges?: boolean
}

/**
 * Settings Section Component
 */
export interface SettingsSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  badge?: string | number
  actions?: React.ReactNode
}

const SettingsSection = React.forwardRef<HTMLDivElement, SettingsSectionProps>(
  ({
    className,
    title,
    description,
    icon,
    children,
    collapsible = false,
    defaultCollapsed = false,
    badge,
    actions,
    ...props
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

    return (
      <Card ref={ref} variant="elevated" className={cn("p-6", className)} {...props}>
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div
            className={cn(
              "flex items-center space-x-3",
              collapsible && "cursor-pointer select-none"
            )}
            onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
          >
            {icon && (
              <div className="p-2 rounded-lg bg-[var(--vm-color-surface-elevated)] text-[var(--vm-color-muted)]">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-[var(--vm-color-foreground)] flex items-center gap-2">
                {title}
                {badge && (
                  <span className="px-2 py-1 text-xs rounded-full bg-[var(--vm-color-primary)] text-white">
                    {badge}
                  </span>
                )}
              </h3>
              {description && (
                <p className="text-sm text-[var(--vm-color-muted)] mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {actions}
            {collapsible && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 0 : 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Info size={16} />
                </motion.div>
              </Button>
            )}
          </div>
        </div>

        {/* Section Content */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    )
  }
)

SettingsSection.displayName = "SettingsSection"

/**
 * Settings Field Component
 */
export interface SettingsFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
  required?: boolean
  error?: string
  success?: string
  warning?: string
  children: React.ReactNode
  layout?: "vertical" | "horizontal"
}

const SettingsField = React.forwardRef<HTMLDivElement, SettingsFieldProps>(
  ({
    className,
    label,
    description,
    required = false,
    error,
    success,
    warning,
    children,
    layout = "vertical",
    ...props
  }, ref) => {
    const validationState = error ? "error" : success ? "success" : warning ? "warning" : undefined

    const validationIcons = {
      error: <X size={16} className="text-[var(--vm-color-error)]" />,
      success: <Check size={16} className="text-[var(--vm-color-success)]" />,
      warning: <AlertTriangle size={16} className="text-[var(--vm-color-warning)]" />,
    }

    const validationColors = {
      error: "text-[var(--vm-color-error)]",
      success: "text-[var(--vm-color-success)]",
      warning: "text-[var(--vm-color-warning)]",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-2",
          layout === "horizontal" && "sm:flex sm:items-start sm:justify-between sm:space-y-0 sm:space-x-4",
          className
        )}
        {...props}
      >
        {/* Label */}
        <div className={layout === "horizontal" ? "sm:w-1/3" : ""}>
          <label className="text-sm font-medium text-[var(--vm-color-foreground)] flex items-center gap-1">
            {label}
            {required && <span className="text-[var(--vm-color-error)]">*</span>}
          </label>
          {description && (
            <p className="text-sm text-[var(--vm-color-muted)] mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Input */}
        <div className={layout === "horizontal" ? "sm:w-2/3" : ""}>
          {children}

          {/* Validation Message */}
          {validationState && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-2 mt-2 text-sm",
                validationColors[validationState]
              )}
            >
              {validationIcons[validationState]}
              <span>{error || success || warning}</span>
            </motion.div>
          )}
        </div>
      </div>
    )
  }
)

SettingsField.displayName = "SettingsField"

/**
 * Settings Toggle Component
 */
export interface SettingsToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  description?: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
  layout?: "vertical" | "horizontal"
}

const SettingsToggle = React.forwardRef<HTMLDivElement, SettingsToggleProps>(
  ({
    className,
    label,
    description,
    enabled,
    onChange,
    disabled = false,
    layout = "horizontal",
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between py-3",
          layout === "vertical" && "flex-col space-y-3",
          className
        )}
        {...props}
      >
        <div className={layout === "vertical" ? "w-full" : "flex-1 mr-4"}>
          <div className="text-sm font-medium text-[var(--vm-color-foreground)]">
            {label}
          </div>
          {description && (
            <div className="text-sm text-[var(--vm-color-muted)] mt-1">
              {description}
            </div>
          )}
        </div>

        <motion.button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(!enabled)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--vm-color-focus-ring)] focus:ring-offset-2",
            enabled ? "bg-[var(--vm-color-primary)]" : "bg-[var(--vm-color-border)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          whileTap={!disabled ? { scale: 0.95 } : undefined}
        >
          <motion.span
            animate={{ x: enabled ? 20 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block h-4 w-4 rounded-full bg-white shadow transform"
          />
        </motion.button>
      </div>
    )
  }
)

SettingsToggle.displayName = "SettingsToggle"

/**
 * Main Settings Panel Component
 */
const SettingsPanel = React.forwardRef<HTMLDivElement, SettingsPanelProps>(
  ({
    className,
    layout = "default",
    children,
    loading = false,
    onSave,
    onReset,
    hasUnsavedChanges = false,
    ...props
  }, ref) => {
    const [isSaving, setIsSaving] = React.useState(false)

    const handleSave = async () => {
      if (!onSave) return
      
      setIsSaving(true)
      try {
        await onSave({}) // Pass form data here
      } finally {
        setIsSaving(false)
      }
    }

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="xl" label="Loading settings..." />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(settingsPanelVariants({ layout }), className)}
        {...props}
      >
        {children}

        {/* Action Bar */}
        {(onSave || onReset) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-0 bg-[var(--vm-color-background)]/80 backdrop-blur-sm border-t border-[var(--vm-color-border)] p-4 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center space-x-2 text-sm text-[var(--vm-color-warning)]"
                  >
                    <AlertTriangle size={16} />
                    <span>You have unsaved changes</span>
                  </motion.div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {onReset && (
                  <Button
                    variant="ghost"
                    onClick={onReset}
                    leftIcon={<RotateCcw size={16} />}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                )}

                {onSave && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    leftIcon={<Save size={16} />}
                    disabled={!hasUnsavedChanges}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    )
  }
)

SettingsPanel.displayName = "SettingsPanel"

/**
 * Pre-built Settings Sections
 */

// Profile Settings
export const ProfileSettings = () => (
  <SettingsSection
    title="Profile Information"
    description="Manage your personal information and account details"
    icon={<User size={20} />}
  >
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SettingsField label="First Name" required>
          <EnhancedInput placeholder="Enter first name" />
        </SettingsField>
        <SettingsField label="Last Name" required>
          <EnhancedInput placeholder="Enter last name" />
        </SettingsField>
      </div>
      
      <SettingsField label="Email Address" required>
        <EnhancedInput type="email" placeholder="Enter email address" />
      </SettingsField>
      
      <SettingsField label="Bio" description="Tell us a bit about yourself">
        <textarea
          className="w-full px-3 py-2 border border-[var(--vm-color-border)] rounded-lg bg-transparent resize-none"
          rows={3}
          placeholder="Enter your bio..."
        />
      </SettingsField>
    </div>
  </SettingsSection>
)

// Notification Settings
export const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = React.useState(true)
  const [pushNotifications, setPushNotifications] = React.useState(false)
  const [smsNotifications, setSmsNotifications] = React.useState(false)

  return (
    <SettingsSection
      title="Notification Preferences"
      description="Choose how you want to be notified"
      icon={<Bell size={20} />}
    >
      <div className="space-y-4">
        <SettingsToggle
          label="Email Notifications"
          description="Receive notifications via email"
          enabled={emailNotifications}
          onChange={setEmailNotifications}
        />
        <SettingsToggle
          label="Push Notifications"
          description="Receive browser push notifications"
          enabled={pushNotifications}
          onChange={setPushNotifications}
        />
        <SettingsToggle
          label="SMS Notifications"
          description="Receive notifications via SMS"
          enabled={smsNotifications}
          onChange={setSmsNotifications}
        />
      </div>
    </SettingsSection>
  )
}

// Security Settings
export const SecuritySettings = () => (
  <SettingsSection
    title="Security & Privacy"
    description="Manage your account security and privacy settings"
    icon={<Shield size={20} />}
  >
    <div className="space-y-6">
      <SettingsField label="Current Password" required>
        <EnhancedInput type="password" showPasswordToggle />
      </SettingsField>
      
      <SettingsField label="New Password">
        <EnhancedInput type="password" showPasswordToggle />
      </SettingsField>
      
      <SettingsField label="Confirm New Password">
        <EnhancedInput type="password" showPasswordToggle />
      </SettingsField>

      <div className="pt-4 border-t border-[var(--vm-color-border)]">
        <SettingsToggle
          label="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          enabled={false}
          onChange={() => {}}
        />
      </div>
    </div>
  </SettingsSection>
)

export { 
  SettingsPanel, 
  SettingsSection, 
  SettingsField, 
  SettingsToggle,
  settingsPanelVariants 
}

export type { 
  SettingsPanelProps, 
  SettingsSectionProps, 
  SettingsFieldProps, 
  SettingsToggleProps 
}