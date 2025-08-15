import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "./badge"

/**
 * Premium Sidebar Navigation Component
 * Executive-grade navigation with glassmorphism and smooth animations
 */

const sidebarVariants = cva(
  [
    "flex flex-col h-screen transition-all duration-vm-slow ease-vm-luxury",
    "bg-gradient-to-b from-vm-surface via-vm-surface-elevated to-vm-surface-overlay",
    "border-r border-vm-glass-border backdrop-blur-xl",
    "relative overflow-hidden",
  ],
  {
    variants: {
      collapsed: {
        true: "w-20",
        false: "w-72",
      },
      variant: {
        default: [
          "shadow-vm-lg",
        ],
        floating: [
          "m-4 rounded-2xl shadow-vm-2xl",
          "h-[calc(100vh-2rem)]",
        ],
        glass: [
          "bg-vm-glass backdrop-blur-2xl",
          "border-vm-glass-border/50",
        ],
      }
    },
    defaultVariants: {
      collapsed: false,
      variant: "default",
    },
  }
)

const sidebarHeaderVariants = cva(
  [
    "flex items-center transition-all duration-vm-normal",
    "border-b border-vm-glass-border/50 backdrop-blur-sm",
  ],
  {
    variants: {
      collapsed: {
        true: "p-4 justify-center",
        false: "p-6 justify-between",
      }
    },
    defaultVariants: {
      collapsed: false,
    },
  }
)

const sidebarItemVariants = cva(
  [
    "group relative flex items-center transition-all duration-vm-normal",
    "text-vm-muted hover:text-vm-foreground cursor-pointer",
    "before:absolute before:left-0 before:w-1 before:h-0 before:bg-vm-primary",
    "before:transition-all before:duration-vm-normal before:rounded-r-full",
    "hover:before:h-8 hover:bg-vm-surface-elevated/50",
  ],
  {
    variants: {
      collapsed: {
        true: "p-3 justify-center mx-2 rounded-xl",
        false: "p-4 pl-6",
      },
      active: {
        true: [
          "text-vm-foreground bg-vm-surface-elevated",
          "before:h-8 shadow-vm-sm",
          "border-r-2 border-vm-primary/30",
        ],
        false: "",
      },
      variant: {
        default: "",
        highlighted: "bg-vm-primary/10 border border-vm-primary/20 rounded-lg mx-2",
      }
    },
    defaultVariants: {
      collapsed: false,
      active: false,
      variant: "default",
    },
  }
)

interface SidebarProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  onToggle?: () => void
}

interface SidebarHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarHeaderVariants> {
  logo?: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

interface SidebarItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarItemVariants> {
  icon: React.ReactNode
  label: string
  badge?: string | number
  notification?: boolean
  href?: string
  onClick?: () => void
}

interface SidebarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  collapsed?: boolean
}

const SidebarContext = React.createContext<{
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}>({
  collapsed: false,
  setCollapsed: () => {}
})

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsed = false, variant, onToggle, children, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(collapsed)

    const handleToggle = React.useCallback(() => {
      setIsCollapsed(!isCollapsed)
      onToggle?.()
    }, [isCollapsed, onToggle])

    return (
      <SidebarContext.Provider value={{ collapsed: isCollapsed, setCollapsed: setIsCollapsed }}>
        <motion.div
          ref={ref}
          className={cn(sidebarVariants({ collapsed: isCollapsed, variant }), className)}
          initial={false}
          animate={{ width: isCollapsed ? 80 : 288 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          {...props}
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-vm-primary/5 via-transparent to-vm-accent/5 pointer-events-none" />
          
          {children}
          
          {/* Collapse Toggle Button */}
          <motion.button
            onClick={handleToggle}
            className={cn(
              "absolute -right-3 top-20 z-10",
              "w-6 h-6 rounded-full bg-vm-surface border border-vm-glass-border",
              "flex items-center justify-center text-vm-muted hover:text-vm-foreground",
              "shadow-vm-md hover:shadow-vm-lg transition-all duration-vm-normal",
              "hover:bg-vm-surface-elevated"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth={2}
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path d="M15 18l-6-6 6-6"/>
            </motion.svg>
          </motion.button>
        </motion.div>
      </SidebarContext.Provider>
    )
  }
)

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, logo, title, subtitle, actions, ...props }, ref) => {
    const { collapsed } = React.useContext(SidebarContext)

    return (
      <div
        ref={ref}
        className={cn(sidebarHeaderVariants({ collapsed }), className)}
        {...props}
      >
        <div className="flex items-center gap-3 min-w-0">
          {logo && (
            <motion.div
              className="flex-shrink-0"
              animate={{ scale: collapsed ? 1.2 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {logo}
            </motion.div>
          )}
          
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                className="min-w-0 flex-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {title && (
                  <h1 className="vm-text-lg font-semibold text-vm-foreground truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="vm-text-small text-vm-muted truncate">
                    {subtitle}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!collapsed && actions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {actions}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ 
    className, 
    icon, 
    label, 
    badge, 
    notification, 
    active, 
    variant,
    href,
    onClick,
    ...props 
  }, ref) => {
    const { collapsed } = React.useContext(SidebarContext)

    const handleClick = () => {
      if (href) {
        window.location.href = href
      }
      onClick?.()
    }

    return (
      <motion.div
        ref={ref}
        className={cn(sidebarItemVariants({ collapsed, active, variant }), className)}
        onClick={handleClick}
        whileHover={{ x: collapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        <motion.div
          className="flex-shrink-0 w-6 h-6"
          animate={{ scale: collapsed && active ? 1.2 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="flex-1 flex items-center justify-between ml-3 min-w-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              <span className="vm-text-sm font-medium truncate">
                {label}
              </span>
              
              <div className="flex items-center gap-2">
                {notification && (
                  <div className="w-2 h-2 bg-vm-primary rounded-full animate-pulse" />
                )}
                {badge && (
                  <Badge variant="secondary" size="sm">
                    {badge}
                  </Badge>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip for collapsed state */}
        {collapsed && (
          <motion.div
            className="absolute left-full ml-2 px-2 py-1 bg-vm-surface-overlay border border-vm-glass-border rounded-md shadow-vm-lg opacity-0 group-hover:opacity-100 transition-opacity duration-vm-fast pointer-events-none z-50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <span className="vm-text-small font-medium text-vm-foreground whitespace-nowrap">
              {label}
            </span>
            {badge && (
              <Badge variant="secondary" size="xs" className="ml-2">
                {badge}
              </Badge>
            )}
          </motion.div>
        )}
      </motion.div>
    )
  }
)

const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({ className, label, collapsed, children, ...props }, ref) => {
    const { collapsed: sidebarCollapsed } = React.useContext(SidebarContext)
    const isCollapsed = collapsed ?? sidebarCollapsed

    return (
      <div ref={ref} className={cn("py-2", className)} {...props}>
        <AnimatePresence>
          {label && !isCollapsed && (
            <motion.div
              className="px-6 py-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="vm-text-micro text-vm-muted font-semibold">
                {label}
              </h3>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="space-y-1">
          {children}
        </div>
      </div>
    )
  }
)

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto py-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { collapsed } = React.useContext(SidebarContext)

    return (
      <div
        ref={ref}
        className={cn(
          "border-t border-vm-glass-border/50 bg-vm-surface-elevated/50 backdrop-blur-sm",
          collapsed ? "p-4" : "p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

// Display names
Sidebar.displayName = "Sidebar"
SidebarHeader.displayName = "SidebarHeader"
SidebarItem.displayName = "SidebarItem"
SidebarGroup.displayName = "SidebarGroup"
SidebarContent.displayName = "SidebarContent"
SidebarFooter.displayName = "SidebarFooter"

export {
  Sidebar,
  SidebarHeader,
  SidebarItem,
  SidebarGroup,
  SidebarContent,
  SidebarFooter,
  sidebarVariants,
  sidebarItemVariants,
}

export type {
  SidebarProps,
  SidebarHeaderProps,
  SidebarItemProps,
  SidebarGroupProps,
}