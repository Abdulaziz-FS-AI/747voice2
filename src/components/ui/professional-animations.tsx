/**
 * Professional Animation Components
 * Voice Matrix Professional Design System v7.0
 */

import * as React from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

/**
 * Professional Animation Variants
 * Based on Voice Matrix Style Guide timing and easing
 */

// Executive fade animations
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] // Executive easing
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Executive slide animations
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Executive scale animations
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95 
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Executive stagger animations
export const staggerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
}

export const staggerChildVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Executive hover animations
export const hoverLiftVariants: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { 
    y: -2, 
    scale: 1.02,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  tap: { 
    y: 0, 
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

// Executive glow animations
export const glowVariants: Variants = {
  rest: { 
    boxShadow: "0 0 0 rgba(72, 187, 120, 0)" 
  },
  hover: { 
    boxShadow: "0 0 20px rgba(72, 187, 120, 0.3)",
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}

/**
 * Professional Animation Components
 */

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0, 
  duration = 0.3,
  className 
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ 
      duration, 
      delay,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
)

interface SlideInProps {
  children: React.ReactNode
  direction?: "up" | "down" | "left" | "right"
  delay?: number
  duration?: number
  className?: string
}

export const SlideIn: React.FC<SlideInProps> = ({ 
  children, 
  direction = "up",
  delay = 0,
  duration = 0.3,
  className 
}) => {
  const initialPosition = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 }
  }

  return (
    <motion.div
      className={className}
      initial={{ 
        opacity: 0, 
        ...initialPosition[direction] 
      }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0 
      }}
      transition={{ 
        duration, 
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  )
}

interface ScaleInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}

export const ScaleIn: React.FC<ScaleInProps> = ({ 
  children, 
  delay = 0,
  duration = 0.2,
  className 
}) => (
  <motion.div
    className={className}
    initial={{ 
      opacity: 0, 
      scale: 0.95 
    }}
    animate={{ 
      opacity: 1, 
      scale: 1 
    }}
    transition={{ 
      duration, 
      delay,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
)

interface StaggerContainerProps {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children, 
  staggerDelay = 0.1,
  className 
}) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1,
        }
      }
    }}
    initial="hidden"
    animate="visible"
  >
    {children}
  </motion.div>
)

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={className}
    variants={staggerChildVariants}
  >
    {children}
  </motion.div>
)

interface HoverLiftProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export const HoverLift: React.FC<HoverLiftProps> = ({ 
  children, 
  className,
  disabled = false 
}) => (
  <motion.div
    className={cn(className, !disabled && "cursor-pointer")}
    variants={hoverLiftVariants}
    initial="rest"
    whileHover={!disabled ? "hover" : "rest"}
    whileTap={!disabled ? "tap" : "rest"}
  >
    {children}
  </motion.div>
)

interface HoverGlowProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  disabled?: boolean
}

export const HoverGlow: React.FC<HoverGlowProps> = ({ 
  children, 
  className,
  glowColor = "rgba(96, 165, 250, 0.3)",
  disabled = false 
}) => (
  <motion.div
    className={cn(className, !disabled && "cursor-pointer")}
    initial={{ 
      boxShadow: `0 0 0 ${glowColor.replace("0.3", "0")}` 
    }}
    whileHover={!disabled ? { 
      boxShadow: `0 0 20px ${glowColor}`,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    } : {}}
  >
    {children}
  </motion.div>
)

/**
 * Professional Loading Animation
 */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  color?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = "md",
  color = "oklch(0.6000_0.1800_45)",
  className 
}) => {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <motion.div
      className={cn(sizeMap[size], className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="15.708"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`
          }}
        />
      </svg>
    </motion.div>
  )
}

/**
 * Professional Shimmer Effect
 */
interface ShimmerProps {
  className?: string
}

export const Shimmer: React.FC<ShimmerProps> = ({ className }) => (
  <motion.div
    className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-r from-[oklch(0.1800_0.0450_240)] via-[oklch(0.2200_0.0500_245)] to-[oklch(0.1800_0.0450_240)]",
      "bg-[length:200%_100%]",
      className
    )}
    animate={{
      backgroundPosition: ["-200% 0", "200% 0"]
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }}
  />
)

/**
 * Professional Page Transition
 */
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
)

/**
 * Professional Modal Animation
 */
interface ModalAnimationProps {
  children: React.ReactNode
  className?: string
}

export const ModalAnimation: React.FC<ModalAnimationProps> = ({ 
  children, 
  className 
}) => (
  <AnimatePresence>
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
)

/**
 * Professional Backdrop Animation
 */
interface BackdropAnimationProps {
  children: React.ReactNode
  className?: string
}

export const BackdropAnimation: React.FC<BackdropAnimationProps> = ({ 
  children, 
  className 
}) => (
  <motion.div
    className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm",
      className
    )}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
)

export {
  fadeVariants,
  slideUpVariants,
  scaleVariants,
  staggerVariants,
  staggerChildVariants,
  hoverLiftVariants,
  glowVariants
}