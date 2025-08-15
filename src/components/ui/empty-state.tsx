import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Button } from "./button"

/**
 * Engaging Empty State Component
 * Premium design with illustrations and progressive disclosure
 */

const emptyStateVariants = cva(
  [
    "flex flex-col items-center justify-center text-center",
    "transition-all duration-vm-normal",
  ],
  {
    variants: {
      size: {
        sm: ["py-8 px-4 max-w-sm"],
        md: ["py-12 px-6 max-w-md"],
        lg: ["py-16 px-8 max-w-lg"],
        xl: ["py-20 px-10 max-w-xl"],
      },
      variant: {
        default: [],
        card: [
          "bg-vm-surface border border-vm-glass-border rounded-2xl",
          "shadow-vm-md backdrop-blur-lg",
        ],
        hero: [
          "min-h-[60vh] bg-gradient-to-br from-vm-surface via-vm-surface-elevated to-vm-surface-overlay",
          "border border-vm-glass-border rounded-3xl shadow-vm-xl backdrop-blur-2xl",
        ],
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "ghost"
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary" | "ghost"
  }
  animated?: boolean
  illustration?: "assistants" | "calls" | "analytics" | "settings" | "custom"
  customIllustration?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ 
    className, 
    size, 
    variant,
    icon,
    title,
    description,
    action,
    secondaryAction,
    animated = true,
    illustration,
    customIllustration,
    ...props 
  }, ref) => {
    const containerVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.6,
          ease: [0.25, 0.1, 0.25, 1],
          staggerChildren: 0.1,
        },
      },
    }

    const itemVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
      },
    }

    const renderIllustration = () => {
      if (customIllustration) return customIllustration

      switch (illustration) {
        case "assistants":
          return <AssistantsIllustration />
        case "calls":
          return <CallsIllustration />
        case "analytics":
          return <AnalyticsIllustration />
        case "settings":
          return <SettingsIllustration />
        default:
          return null
      }
    }

    const content = (
      <>
        {/* Illustration or Icon */}
        {(illustration || customIllustration || icon) && (
          <motion.div
            className="mb-6"
            variants={animated ? itemVariants : undefined}
          >
            {renderIllustration() || (
              <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-vm-primary/10 border border-vm-primary/20 text-vm-primary">
                {icon}
              </div>
            )}
          </motion.div>
        )}

        {/* Title */}
        <motion.h3
          className="vm-display-small mb-3"
          variants={animated ? itemVariants : undefined}
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description && (
          <motion.p
            className="vm-text-body text-vm-muted mb-8 max-w-md"
            variants={animated ? itemVariants : undefined}
          >
            {description}
          </motion.p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <motion.div
            className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
            variants={animated ? itemVariants : undefined}
          >
            {action && (
              <Button
                variant={action.variant || "primary"}
                size="lg"
                onClick={action.onClick}
                className="flex-1"
                asMotion
                motionProps={{
                  whileHover: { scale: 1.02 },
                  whileTap: { scale: 0.98 },
                }}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant || "ghost"}
                size="lg"
                onClick={secondaryAction.onClick}
                className="flex-1"
                asMotion
                motionProps={{
                  whileHover: { scale: 1.02 },
                  whileTap: { scale: 0.98 },
                }}
              >
                {secondaryAction.label}
              </Button>
            )}
          </motion.div>
        )}
      </>
    )

    if (animated) {
      return (
        <motion.div
          ref={ref}
          className={cn(emptyStateVariants({ size, variant }), className)}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          {...props}
        >
          {content}
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ size, variant }), className)}
        {...props}
      >
        {content}
      </div>
    )
  }
)

EmptyState.displayName = "EmptyState"

/**
 * Illustration Components
 */

const AssistantsIllustration = () => (
  <motion.div
    className="w-32 h-32 relative"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {/* Background Glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-vm-primary/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
    
    {/* Main Circle */}
    <motion.div
      className="relative w-full h-full rounded-full bg-gradient-to-br from-vm-primary/10 via-vm-surface-elevated to-vm-surface-overlay border border-vm-glass-border backdrop-blur-lg flex items-center justify-center"
      animate={{ 
        rotate: [0, 360],
      }}
      transition={{ 
        duration: 20, 
        ease: "linear", 
        repeat: Infinity 
      }}
    >
      {/* Robot Icon */}
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-vm-primary"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <rect width="18" height="10" x="3" y="11" rx="2"/>
        <circle cx="12" cy="5" r="2"/>
        <path d="M12 7v4"/>
        <line x1="8" x2="8" y1="16" y2="16"/>
        <line x1="16" x2="16" y1="16" y2="16"/>
      </motion.svg>
    </motion.div>

    {/* Floating Dots */}
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 bg-vm-primary/40 rounded-full"
        style={{
          top: `${20 + i * 20}%`,
          right: `${10 + i * 15}%`,
        }}
        animate={{
          y: [-5, 5, -5],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2 + i * 0.5,
          ease: "easeInOut",
          repeat: Infinity,
          delay: i * 0.3,
        }}
      />
    ))}
  </motion.div>
)

const CallsIllustration = () => (
  <motion.div
    className="w-32 h-32 relative"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-vm-success/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
    
    {/* Phone Icon Container */}
    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-vm-success/10 via-vm-surface-elevated to-vm-surface-overlay border border-vm-glass-border backdrop-blur-lg flex items-center justify-center">
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-vm-success"
        animate={{
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </motion.svg>
    </div>

    {/* Signal Waves */}
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute border-2 border-vm-success/30 rounded-full"
        style={{
          width: `${100 + i * 20}%`,
          height: `${100 + i * 20}%`,
          top: `${-10 - i * 10}%`,
          left: `${-10 - i * 10}%`,
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          delay: i * 0.4,
        }}
      />
    ))}
  </motion.div>
)

const AnalyticsIllustration = () => (
  <motion.div
    className="w-32 h-32 relative"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-vm-warning/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
    
    {/* Chart Container */}
    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-vm-warning/10 via-vm-surface-elevated to-vm-surface-overlay border border-vm-glass-border backdrop-blur-lg flex items-center justify-center">
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-vm-warning"
      >
        <path d="M3 3v18h18"/>
        <motion.path
          d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      </motion.svg>
    </div>

    {/* Data Points */}
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1.5 h-1.5 bg-vm-warning rounded-full"
        style={{
          bottom: `${25 + Math.sin(i) * 20}%`,
          left: `${20 + i * 20}%`,
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </motion.div>
)

const SettingsIllustration = () => (
  <motion.div
    className="w-32 h-32 relative"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {/* Background */}
    <div className="absolute inset-0 bg-gradient-to-br from-vm-muted/20 via-vm-accent/10 to-transparent rounded-full blur-2xl" />
    
    {/* Gear Container */}
    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-vm-muted/10 via-vm-surface-elevated to-vm-surface-overlay border border-vm-glass-border backdrop-blur-lg flex items-center justify-center">
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-vm-muted"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 8,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6"/>
        <path d="m9 9 3-3 3 3"/>
        <path d="m9 15 3 3 3-3"/>
        <path d="M1 12h6m6 0h6"/>
        <path d="m9 9-3-3-3 3"/>
        <path d="m15 15 3 3 3-3"/>
      </motion.svg>
    </div>
  </motion.div>
)

/**
 * Preset Empty State Components for common scenarios
 */

interface NoAssistantsEmptyStateProps {
  onCreateAssistant: () => void
  onLearnMore?: () => void
}

const NoAssistantsEmptyState = ({ onCreateAssistant, onLearnMore }: NoAssistantsEmptyStateProps) => (
  <EmptyState
    variant="hero"
    size="xl"
    illustration="assistants"
    title="No assistants assigned yet"
    description="Your administrator will assign AI assistants to your account. Once assigned, you'll see them here and can start interacting with them."
    action={{
      label: "View All Assistants",
      onClick: onCreateAssistant,
      variant: "primary",
    }}
    secondaryAction={onLearnMore ? {
      label: "Learn More",
      onClick: onLearnMore,
      variant: "ghost",
    } : undefined}
  />
)

export {
  EmptyState,
  NoAssistantsEmptyState,
  AssistantsIllustration,
  CallsIllustration,
  AnalyticsIllustration,
  SettingsIllustration,
  emptyStateVariants,
}

export type { EmptyStateProps }