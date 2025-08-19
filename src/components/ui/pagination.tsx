"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal 
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "./button"

/**
 * Modern Pagination component variants
 * Professional pagination for data tables and lists
 */
const paginationVariants = cva(
  [
    "flex items-center justify-center gap-1",
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

export interface PaginationProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof paginationVariants> {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  showInfo?: boolean
  showQuickJumper?: boolean
  disabled?: boolean
  totalItems?: number
  itemsPerPage?: number
}

/**
 * Page button component
 */
interface PageButtonProps {
  page: number
  isActive?: boolean
  onClick: (page: number) => void
  disabled?: boolean
  size?: "sm" | "md" | "lg"
}

const PageButton = React.forwardRef<HTMLButtonElement, PageButtonProps>(
  ({ page, isActive = false, onClick, disabled = false, size = "md" }, ref) => {
    return (
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        <Button
          ref={ref}
          variant={isActive ? "primary" : "ghost"}
          size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"}
          onClick={() => !disabled && onClick(page)}
          disabled={disabled}
          className={cn(
            "min-w-[2.5rem] h-10",
            size === "sm" && "min-w-[2rem] h-8",
            size === "lg" && "min-w-[3rem] h-12",
            isActive && "shadow-sm"
          )}
        >
          {page}
        </Button>
      </motion.div>
    )
  }
)

PageButton.displayName = "PageButton"

/**
 * Ellipsis component for truncated pages
 */
const PaginationEllipsis = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => (
  <div
    className={cn(
      "flex items-center justify-center min-w-[2.5rem] h-10 text-[var(--vm-color-muted)]",
      size === "sm" && "min-w-[2rem] h-8 text-xs",
      size === "lg" && "min-w-[3rem] h-12 text-lg"
    )}
  >
    <MoreHorizontal size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
  </div>
)

/**
 * Quick jumper component
 */
interface QuickJumperProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  size?: "sm" | "md" | "lg"
}

const QuickJumper = ({ currentPage, totalPages, onPageChange, size = "md" }: QuickJumperProps) => {
  const [inputValue, setInputValue] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(inputValue, 10)
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      setInputValue("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 text-sm">
      <span className="text-[var(--vm-color-muted)]">Go to</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={String(currentPage)}
        className={cn(
          "w-16 px-2 py-1 text-center border rounded",
          "border-[var(--vm-color-border)] bg-[var(--vm-color-surface)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--vm-color-focus-ring)]",
          size === "sm" && "text-xs h-6 w-12",
          size === "lg" && "text-base h-10 w-20"
        )}
      />
      <Button 
        type="submit" 
        variant="outline" 
        size={size}
        disabled={!inputValue || parseInt(inputValue, 10) < 1 || parseInt(inputValue, 10) > totalPages}
      >
        Go
      </Button>
    </form>
  )
}

/**
 * Main Pagination component
 */
const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({
    className,
    size = "md",
    currentPage,
    totalPages,
    onPageChange,
    showFirstLast = true,
    showPrevNext = true,
    maxVisiblePages = 7,
    showInfo = true,
    showQuickJumper = false,
    disabled = false,
    totalItems,
    itemsPerPage,
    ...props
  }, ref) => {
    // Calculate visible pages
    const visiblePages = React.useMemo(() => {
      const pages: (number | 'ellipsis')[] = []

      if (totalPages <= maxVisiblePages) {
        // Show all pages if total is less than max visible
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Always show first page
        pages.push(1)

        const leftBoundary = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2) + 1)
        const rightBoundary = Math.min(totalPages - 1, currentPage + Math.floor(maxVisiblePages / 2) - 1)

        // Add left ellipsis
        if (leftBoundary > 2) {
          pages.push('ellipsis')
        }

        // Add visible pages around current
        for (let i = leftBoundary; i <= rightBoundary; i++) {
          pages.push(i)
        }

        // Add right ellipsis
        if (rightBoundary < totalPages - 1) {
          pages.push('ellipsis')
        }

        // Always show last page
        if (totalPages > 1) {
          pages.push(totalPages)
        }
      }

      return pages
    }, [currentPage, totalPages, maxVisiblePages])

    // Navigation handlers
    const handleFirst = () => !disabled && onPageChange(1)
    const handlePrevious = () => !disabled && currentPage > 1 && onPageChange(currentPage - 1)
    const handleNext = () => !disabled && currentPage < totalPages && onPageChange(currentPage + 1)
    const handleLast = () => !disabled && onPageChange(totalPages)

    // Calculate info text
    const infoText = React.useMemo(() => {
      if (!showInfo || !totalItems || !itemsPerPage) return null

      const start = (currentPage - 1) * itemsPerPage + 1
      const end = Math.min(currentPage * itemsPerPage, totalItems)

      return `Showing ${start} to ${end} of ${totalItems} results`
    }, [currentPage, totalItems, itemsPerPage, showInfo])

    if (totalPages <= 1) return null

    return (
      <div className="flex flex-col gap-4">
        {/* Info and Quick Jumper */}
        {(showInfo || showQuickJumper) && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {infoText && (
              <div className="text-sm text-[var(--vm-color-muted)]">
                {infoText}
              </div>
            )}
            {showQuickJumper && (
              <QuickJumper
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
                size={size}
              />
            )}
          </div>
        )}

        {/* Pagination Controls */}
        <div
          ref={ref}
          className={cn(paginationVariants({ size }), className)}
          {...props}
        >
          {/* First Page */}
          {showFirstLast && (
            <Button
              variant="outline"
              size={size}
              onClick={handleFirst}
              disabled={disabled || currentPage === 1}
              leftIcon={<ChevronsLeft size={16} />}
              className="min-w-[2.5rem]"
              title="First page"
            >
              <span className="sr-only sm:not-sr-only">First</span>
            </Button>
          )}

          {/* Previous Page */}
          {showPrevNext && (
            <Button
              variant="outline"
              size={size}
              onClick={handlePrevious}
              disabled={disabled || currentPage === 1}
              leftIcon={<ChevronLeft size={16} />}
              className="min-w-[2.5rem]"
              title="Previous page"
            >
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>
          )}

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {visiblePages.map((page, index) => (
              page === 'ellipsis' ? (
                <PaginationEllipsis key={`ellipsis-${index}`} size={size} />
              ) : (
                <PageButton
                  key={page}
                  page={page}
                  isActive={page === currentPage}
                  onClick={onPageChange}
                  disabled={disabled}
                  size={size}
                />
              )
            ))}
          </div>

          {/* Next Page */}
          {showPrevNext && (
            <Button
              variant="outline"
              size={size}
              onClick={handleNext}
              disabled={disabled || currentPage === totalPages}
              rightIcon={<ChevronRight size={16} />}
              className="min-w-[2.5rem]"
              title="Next page"
            >
              <span className="sr-only sm:not-sr-only">Next</span>
            </Button>
          )}

          {/* Last Page */}
          {showFirstLast && (
            <Button
              variant="outline"
              size={size}
              onClick={handleLast}
              disabled={disabled || currentPage === totalPages}
              rightIcon={<ChevronsRight size={16} />}
              className="min-w-[2.5rem]"
              title="Last page"
            >
              <span className="sr-only sm:not-sr-only">Last</span>
            </Button>
          )}
        </div>
      </div>
    )
  }
)

Pagination.displayName = "Pagination"

/**
 * Simple pagination hook
 */
export function usePagination({
  totalItems,
  itemsPerPage = 10,
  initialPage = 1,
}: {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}) {
  const [currentPage, setCurrentPage] = React.useState(initialPage)
  
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)))
  }
  
  const nextPage = () => goToPage(currentPage + 1)
  const previousPage = () => goToPage(currentPage - 1)
  const firstPage = () => goToPage(1)
  const lastPage = () => goToPage(totalPages)
  
  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  }
}

export { Pagination, PageButton, PaginationEllipsis, QuickJumper, paginationVariants }
export type { PaginationProps, PageButtonProps, QuickJumperProps }