"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  Settings, 
  User,
  ChevronDown,
  LogOut,
  Palette,
  Moon,
  Sun,
  Monitor
} from "lucide-react"
import { Button } from "../ui/button"
import { EnhancedInput } from "../ui/enhanced-input"
import { Card } from "../ui/card"
import { LoadingSpinner } from "../ui/loading-spinner"

/**
 * Modern Dashboard Layout variants
 * Professional SaaS dashboard with sidebar and header
 */
const dashboardLayoutVariants = cva(
  [
    "min-h-screen bg-[var(--vm-color-background)]",
    "text-[var(--vm-color-foreground)]",
  ],
  {
    variants: {
      sidebarWidth: {
        sm: "md:pl-60",
        md: "md:pl-72", 
        lg: "md:pl-80",
        xl: "md:pl-96",
      },
      headerHeight: {
        sm: "pt-14",
        md: "pt-16",
        lg: "pt-20",
      },
    },
    defaultVariants: {
      sidebarWidth: "md",
      headerHeight: "md",
    },
  }
)

export interface DashboardLayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dashboardLayoutVariants> {
  children: React.ReactNode
  sidebar: React.ReactNode
  header?: React.ReactNode
  loading?: boolean
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

/**
 * Sidebar Component
 */
export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  collapsed?: boolean
  onToggle?: () => void
  width?: "sm" | "md" | "lg" | "xl"
}

const sidebarVariants = cva(
  [
    "fixed left-0 top-0 z-40 h-full",
    "bg-[var(--vm-color-surface)] border-r border-[var(--vm-color-border)]",
    "transition-transform duration-300 ease-out",
    "transform -translate-x-full md:translate-x-0",
    "flex flex-col",
  ],
  {
    variants: {
      width: {
        sm: "w-60",
        md: "w-72",
        lg: "w-80", 
        xl: "w-96",
      },
      collapsed: {
        true: "md:w-16",
        false: "",
      },
    },
    defaultVariants: {
      width: "md",
      collapsed: false,
    },
  }
)

const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  ({ className, children, collapsed = false, onToggle, width = "md", ...props }, ref) => {
    return (
      <>
        {/* Mobile Backdrop */}
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" />
        
        {/* Sidebar */}
        <aside
          ref={ref}
          className={cn(sidebarVariants({ width, collapsed }), className)}
          {...props}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--vm-color-border)]">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--vm-gradient-primary)] flex items-center justify-center text-white font-bold">
                  VM
                </div>
                <span className="font-semibold">Voice Matrix</span>
              </motion.div>
            )}
            
            {/* Toggle Button */}
            <Button
              variant="ghost" 
              size="icon-sm"
              onClick={onToggle}
              className="md:hidden"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {children}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[var(--vm-color-border)]">
            {!collapsed ? (
              <div className="text-xs text-[var(--vm-color-muted)]">
                © 2024 Voice Matrix
              </div>
            ) : (
              <div className="w-6 h-6 rounded bg-[var(--vm-color-muted)]/10" />
            )}
          </div>
        </aside>
      </>
    )
  }
)

Sidebar.displayName = "Sidebar"

/**
 * Sidebar Navigation Item
 */
export interface SidebarNavItemProps extends React.HTMLAttributes<HTMLElement> {
  href?: string
  icon?: React.ReactNode
  children: React.ReactNode
  active?: boolean
  collapsed?: boolean
  badge?: string | number
  disabled?: boolean
}

const sidebarNavItemVariants = cva(
  [
    "flex items-center px-4 py-2 text-sm font-medium rounded-lg mx-2",
    "transition-all duration-200 ease-out",
    "cursor-pointer relative group",
  ],
  {
    variants: {
      active: {
        true: [
          "bg-[var(--vm-color-primary)] text-white",
          "shadow-sm",
        ],
        false: [
          "text-[var(--vm-color-muted)] hover:text-[var(--vm-color-foreground)]",
          "hover:bg-[var(--vm-color-surface-elevated)]",
        ],
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      disabled: false,
    },
  }
)

const SidebarNavItem = React.forwardRef<HTMLElement, SidebarNavItemProps>(
  ({ 
    className, 
    href, 
    icon, 
    children, 
    active = false, 
    collapsed = false,
    badge,
    disabled = false,
    onClick,
    ...props 
  }, ref) => {
    const handleClick = (e: React.MouseEvent) => {
      if (disabled) return
      if (href) {
        window.location.href = href
      }
      onClick?.(e as any)
    }

    return (
      <div
        ref={ref as any}
        className={cn(sidebarNavItemVariants({ active, disabled }), className)}
        onClick={handleClick}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}

        {/* Label */}
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-3 truncate"
          >
            {children}
          </motion.span>
        )}

        {/* Badge */}
        {!collapsed && badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto px-2 py-0.5 text-xs rounded-full bg-[var(--vm-color-accent)] text-white"
          >
            {badge}
          </motion.div>
        )}

        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div className="absolute left-12 px-2 py-1 bg-black text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
            {children}
          </div>
        )}
      </div>
    )
  }
)

SidebarNavItem.displayName = "SidebarNavItem"

/**
 * Dashboard Header Component
 */
export interface DashboardHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  showSearch?: boolean
  searchPlaceholder?: string
  user?: {
    name: string
    email: string
    avatar?: string
  }
  notifications?: number
  onMenuToggle?: () => void
}

const DashboardHeader = React.forwardRef<HTMLElement, DashboardHeaderProps>(
  ({
    className,
    title,
    subtitle,
    actions,
    showSearch = true,
    searchPlaceholder = "Search...",
    user,
    notifications = 0,
    onMenuToggle,
    ...props
  }, ref) => {
    const [showUserMenu, setShowUserMenu] = React.useState(false)
    const [theme, setTheme] = React.useState<"light" | "dark" | "system">("system")

    return (
      <header
        ref={ref}
        className={cn(
          "fixed top-0 left-0 right-0 z-30 h-16",
          "bg-[var(--vm-color-surface)]/80 backdrop-blur-lg",
          "border-b border-[var(--vm-color-border)]",
          "flex items-center justify-between px-4 md:px-6",
          "md:left-72", // Adjust for sidebar width
          className
        )}
        {...props}
      >
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuToggle}
            className="md:hidden"
          >
            <Menu size={16} />
          </Button>

          {/* Title */}
          {(title || subtitle) && (
            <div className="hidden sm:block">
              {title && (
                <h1 className="text-lg font-semibold text-[var(--vm-color-foreground)]">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-[var(--vm-color-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Center Section - Search */}
        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <EnhancedInput
              placeholder={searchPlaceholder}
              leftIcon={<Search size={16} />}
              className="w-full"
            />
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Custom Actions */}
          {actions}

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon-sm">
            {theme === "light" ? <Sun size={16} /> : 
             theme === "dark" ? <Moon size={16} /> : 
             <Monitor size={16} />}
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon-sm">
              <Bell size={16} />
              {notifications > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--vm-color-error)] text-white text-xs rounded-full flex items-center justify-center"
                >
                  {notifications > 9 ? "9+" : notifications}
                </motion.div>
              )}
            </Button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[var(--vm-color-primary)] flex items-center justify-center text-white text-xs">
                  {user?.name?.[0] || <User size={14} />}
                </div>
              )}
              <span className="hidden sm:inline truncate max-w-[100px]">
                {user?.name || "User"}
              </span>
              <ChevronDown size={14} />
            </Button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-12 w-64 bg-[var(--vm-color-surface)] border border-[var(--vm-color-border)] rounded-lg shadow-lg py-2 z-50"
                >
                  {user && (
                    <div className="px-4 py-3 border-b border-[var(--vm-color-border)]">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-[var(--vm-color-muted)]">{user.email}</p>
                    </div>
                  )}
                  
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--vm-color-surface-elevated)] flex items-center space-x-2">
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--vm-color-surface-elevated)] flex items-center space-x-2">
                      <Palette size={16} />
                      <span>Appearance</span>
                    </button>
                    <hr className="my-1 border-[var(--vm-color-border)]" />
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--vm-color-surface-elevated)] text-[var(--vm-color-error)] flex items-center space-x-2">
                      <LogOut size={16} />
                      <span>Sign out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
    )
  }
)

DashboardHeader.displayName = "DashboardHeader"

/**
 * Main Dashboard Layout Component
 */
const DashboardLayout = React.forwardRef<HTMLDivElement, DashboardLayoutProps>(
  ({
    className,
    children,
    sidebar,
    header,
    loading = false,
    sidebarCollapsed = false,
    onSidebarToggle,
    sidebarWidth = "md",
    headerHeight = "md",
    ...props
  }, ref) => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false)

    const handleSidebarToggle = () => {
      setIsMobileSidebarOpen(!isMobileSidebarOpen)
      onSidebarToggle?.()
    }

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--vm-color-background)]">
          <LoadingSpinner size="xl" label="Loading dashboard..." />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(dashboardLayoutVariants({ sidebarWidth, headerHeight }), className)}
        {...props}
      >
        {/* Sidebar */}
        <div className={cn(isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full", "md:translate-x-0")}>
          {sidebar}
        </div>

        {/* Header */}
        {header}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>

        {/* Mobile Overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
            onClick={handleSidebarToggle}
          />
        )}
      </div>
    )
  }
)

DashboardLayout.displayName = "DashboardLayout"

export { 
  DashboardLayout, 
  Sidebar, 
  SidebarNavItem, 
  DashboardHeader,
  dashboardLayoutVariants,
  sidebarVariants,
  sidebarNavItemVariants
}

export type { 
  DashboardLayoutProps, 
  SidebarProps, 
  SidebarNavItemProps, 
  DashboardHeaderProps 
}