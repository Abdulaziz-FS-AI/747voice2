"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ChevronRight, Home } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

/**
 * Modern Breadcrumbs component variants
 * Navigation breadcrumbs for SaaS applications
 */
const breadcrumbsVariants = cva(
  [
    "flex items-center space-x-1 text-sm",
    "text-[var(--vm-color-muted)]",
  ],
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm", 
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const breadcrumbItemVariants = cva(
  [
    "flex items-center transition-colors duration-200",
    "hover:text-[var(--vm-color-foreground)]",
  ],
  {
    variants: {
      active: {
        true: "text-[var(--vm-color-foreground)] font-medium",
        false: "text-[var(--vm-color-muted)]",
      },
      clickable: {
        true: "cursor-pointer hover:text-[var(--vm-color-primary)]",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      active: false,
      clickable: false,
    },
  }
)

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  onClick?: () => void
}

export interface BreadcrumbsProps 
  extends React.HTMLAttributes<HTMLNavElement>,
    VariantProps<typeof breadcrumbsVariants> {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  showHome?: boolean
  homeHref?: string
  homeLabel?: string
  maxItems?: number
}

/**
 * Breadcrumb Separator component
 */
const BreadcrumbSeparator = ({ children }: { children?: React.ReactNode }) => (
  <span className="mx-2 text-[var(--vm-color-border-strong)]" aria-hidden="true">
    {children ?? <ChevronRight size={16} />}
  </span>
)

/**
 * Individual Breadcrumb Item component
 */
const BreadcrumbItem = React.forwardRef<
  HTMLElement,
  {
    item: BreadcrumbItem
    isLast: boolean
    className?: string
  }
>(({ item, isLast, className }, ref) => {
  const isClickable = Boolean(item.href || item.onClick)
  
  const content = (
    <span className="flex items-center gap-2">
      {item.icon}
      <span>{item.label}</span>
    </span>
  )

  if (item.href && !isLast) {
    return (
      <Link
        href={item.href}
        className={cn(
          breadcrumbItemVariants({ 
            active: isLast, 
            clickable: isClickable 
          }),
          className
        )}
        ref={ref as React.RefObject<HTMLAnchorElement>}
      >
        {content}
      </Link>
    )
  }

  if (item.onClick && !isLast) {
    return (
      <button
        type="button"
        onClick={item.onClick}
        className={cn(
          breadcrumbItemVariants({ 
            active: isLast, 
            clickable: isClickable 
          }),
          className
        )}
        ref={ref as React.RefObject<HTMLButtonElement>}
      >
        {content}
      </button>
    )
  }

  return (
    <span
      className={cn(
        breadcrumbItemVariants({ 
          active: isLast, 
          clickable: false 
        }),
        className
      )}
      ref={ref as React.RefObject<HTMLSpanElement>}
    >
      {content}
    </span>
  )
})

BreadcrumbItem.displayName = "BreadcrumbItem"

/**
 * Collapsed breadcrumb items indicator
 */
const BreadcrumbEllipsis = ({ 
  items,
  onExpand 
}: { 
  items: BreadcrumbItem[]
  onExpand?: () => void 
}) => (
  <div className="flex items-center">
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        breadcrumbItemVariants({ clickable: true }),
        "hover:bg-[var(--vm-color-surface-elevated)] px-2 py-1 rounded"
      )}
      title={`Show ${items.length} hidden items`}
    >
      <span className="flex items-center gap-1">
        <span>...</span>
        <span className="text-xs">({items.length})</span>
      </span>
    </button>
  </div>
)

/**
 * Main Breadcrumbs component
 */
const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(
  ({
    className,
    size = "md",
    items,
    separator,
    showHome = true,
    homeHref = "/",
    homeLabel = "Home",
    maxItems = 5,
    ...props
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false)

    // Prepare items with optional home
    const allItems = React.useMemo(() => {
      const homeItem: BreadcrumbItem = {
        label: homeLabel,
        href: homeHref,
        icon: <Home size={16} />,
      }

      return showHome ? [homeItem, ...items] : items
    }, [items, showHome, homeHref, homeLabel])

    // Handle item truncation
    const visibleItems = React.useMemo(() => {
      if (allItems.length <= maxItems || isExpanded) {
        return allItems
      }

      // Show first item, ellipsis, and last few items
      const firstItem = allItems[0]
      const lastItems = allItems.slice(-2)
      const hiddenItems = allItems.slice(1, -2)

      return {
        visible: [firstItem, ...lastItems],
        hidden: hiddenItems,
      }
    }, [allItems, maxItems, isExpanded])

    const renderItems = Array.isArray(visibleItems) 
      ? visibleItems 
      : visibleItems.visible

    const hiddenItems = Array.isArray(visibleItems) 
      ? [] 
      : visibleItems.hidden

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn(breadcrumbsVariants({ size }), className)}
        {...props}
      >
        <ol className="flex items-center space-x-1">
          {renderItems.map((item, index) => {
            const isLast = index === renderItems.length - 1
            const showSeparator = !isLast || hiddenItems.length > 0

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                <li>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: 0.2, 
                      delay: index * 0.05 
                    }}
                  >
                    <BreadcrumbItem 
                      item={item} 
                      isLast={isLast && hiddenItems.length === 0} 
                    />
                  </motion.div>
                </li>
                
                {/* Show ellipsis for hidden items */}
                {index === 0 && hiddenItems.length > 0 && (
                  <li key="ellipsis">
                    <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                    <BreadcrumbEllipsis 
                      items={hiddenItems}
                      onExpand={() => setIsExpanded(true)}
                    />
                  </li>
                )}

                {/* Regular separator */}
                {showSeparator && !(index === 0 && hiddenItems.length > 0) && (
                  <li key={`sep-${index}`}>
                    <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>
                  </li>
                )}
              </React.Fragment>
            )
          })}
        </ol>
      </nav>
    )
  }
)

Breadcrumbs.displayName = "Breadcrumbs"

/**
 * Breadcrumbs hook for automatic breadcrumb generation from pathname
 */
export function useBreadcrumbs(
  pathname: string,
  customLabels?: Record<string, string>
) {
  return React.useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/')
      const label = customLabels?.[segment] || 
                   segment.charAt(0).toUpperCase() + 
                   segment.slice(1).replace(/-/g, ' ')

      return {
        label,
        href,
      }
    })
  }, [pathname, customLabels])
}

export { 
  Breadcrumbs, 
  BreadcrumbItem, 
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  breadcrumbsVariants,
  breadcrumbItemVariants 
}
export type { BreadcrumbsProps, BreadcrumbItem }