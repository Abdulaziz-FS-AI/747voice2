"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown
} from "lucide-react"
import { Button } from "./button"
import { EnhancedInput } from "./enhanced-input"
import { LoadingSpinner } from "./loading-spinner"

/**
 * Modern Data Table component variants
 * Professional tables for SaaS applications
 */
const tableVariants = cva(
  [
    "w-full border-collapse bg-[var(--vm-color-surface)]",
    "border border-[var(--vm-color-border)] rounded-lg overflow-hidden",
  ],
  {
    variants: {
      variant: {
        default: "",
        striped: "",
        bordered: "border border-[var(--vm-color-border)]",
        minimal: "border-none",
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

const cellVariants = cva(
  [
    "px-4 py-3 text-left align-middle",
    "border-b border-[var(--vm-color-border)]",
    "transition-colors duration-200",
  ],
  {
    variants: {
      variant: {
        default: "",
        header: [
          "bg-[var(--vm-color-surface-elevated)]",
          "font-semibold text-[var(--vm-color-foreground)]",
          "border-b-2 border-[var(--vm-color-border-strong)]",
        ],
        cell: "hover:bg-[var(--vm-color-surface-elevated)]/50",
      },
      align: {
        left: "text-left",
        center: "text-center", 
        right: "text-right",
      },
    },
    defaultVariants: {
      variant: "cell",
      align: "left",
    },
  }
)

export interface Column<T> {
  key: keyof T | string
  title: string
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: "left" | "center" | "right"
  render?: (value: any, record: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> extends VariantProps<typeof tableVariants> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  empty?: React.ReactNode
  className?: string
  onRowClick?: (record: T, index: number) => void
  sortable?: boolean
  filterable?: boolean
  pagination?: boolean
  pageSize?: number
  searchable?: boolean
  searchPlaceholder?: string
  rowKey?: keyof T | ((record: T) => string | number)
}

interface SortState {
  key: string | null
  direction: "asc" | "desc" | null
}

/**
 * Enhanced Data Table with sorting, filtering, and search
 */
function DataTable<T extends Record<string, any>>({
  columns,
  data: rawData,
  loading = false,
  empty,
  className,
  variant = "default",
  size = "md",
  onRowClick,
  sortable = true,
  filterable = true,
  pagination = true,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Search...",
  rowKey = "id",
}: DataTableProps<T>) {
  const [sortState, setSortState] = React.useState<SortState>({
    key: null,
    direction: null,
  })
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [filters, setFilters] = React.useState<Record<string, string>>({})

  // Get row key
  const getRowKey = (record: T, index: number): string | number => {
    return typeof rowKey === "function" ? rowKey(record) : record[rowKey] ?? index
  }

  // Filter and search data
  const filteredData = React.useMemo(() => {
    let result = rawData

    // Apply search
    if (searchTerm) {
      result = result.filter(record =>
        Object.values(record).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(record =>
          String(record[key]).toLowerCase().includes(value.toLowerCase())
        )
      }
    })

    return result
  }, [rawData, searchTerm, filters])

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortState.key || !sortState.direction) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortState.key!]
      const bValue = b[sortState.key!]

      if (aValue === bValue) return 0

      const comparison = aValue > bValue ? 1 : -1
      return sortState.direction === "asc" ? comparison : -comparison
    })
  }, [filteredData, sortState])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData
    
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Handle sorting
  const handleSort = (key: string) => {
    if (!sortable) return

    setSortState(prev => {
      if (prev.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" }
        if (prev.direction === "desc") return { key: null, direction: null }
      }
      return { key, direction: "asc" }
    })
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page
  }

  // Render sort icon
  const renderSortIcon = (columnKey: string) => {
    if (sortState.key !== columnKey) {
      return <ChevronsUpDown size={14} className="opacity-50" />
    }
    
    return sortState.direction === "asc" ? 
      <ChevronUp size={14} /> : 
      <ChevronDown size={14} />
  }

  // Empty state
  const emptyComponent = empty ?? (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--vm-color-muted)]">
      <div className="text-6xl mb-4">📊</div>
      <h3 className="text-lg font-semibold mb-2">No data available</h3>
      <p className="text-sm">There are no records to display at the moment.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Table Header with Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Search */}
          {searchable && (
            <div className="flex-1 max-w-sm">
              <EnhancedInput
                type="search"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                size="sm"
              />
            </div>
          )}

          {/* Filter Controls */}
          {filterable && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Filter size={16} />}>
                Filters
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<MoreHorizontal size={16} />}>
                More
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Table Container */}
      <div className="relative overflow-x-auto rounded-lg border border-[var(--vm-color-border)]">
        <table className={cn(tableVariants({ variant, size }), className)}>
          {/* Table Header */}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    cellVariants({ 
                      variant: "header", 
                      align: column.align 
                    }),
                    column.sortable !== false && sortable && "cursor-pointer hover:bg-[var(--vm-color-surface-elevated)]",
                    "select-none"
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable !== false && sortable && renderSortIcon(String(column.key))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            <AnimatePresence mode="wait">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12">
                    <div className="flex justify-center">
                      <LoadingSpinner size="lg" label="Loading data..." />
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-0">
                    {emptyComponent}
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, index) => (
                  <motion.tr
                    key={getRowKey(record, index)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ 
                      duration: 0.2, 
                      delay: index * 0.02 
                    }}
                    className={cn(
                      "group",
                      onRowClick && "cursor-pointer hover:bg-[var(--vm-color-surface-elevated)]/50",
                      variant === "striped" && index % 2 === 0 && "bg-[var(--vm-color-surface-elevated)]/30"
                    )}
                    onClick={() => onRowClick?.(record, index)}
                  >
                    {columns.map((column) => {
                      const value = record[column.key as keyof T]
                      const cellContent = column.render 
                        ? column.render(value, record, index)
                        : String(value ?? "")

                      return (
                        <td
                          key={String(column.key)}
                          className={cn(
                            cellVariants({ 
                              variant: "cell", 
                              align: column.align 
                            })
                          )}
                        >
                          {cellContent}
                        </td>
                      )
                    })}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && sortedData.length > pageSize && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="text-sm text-[var(--vm-color-muted)]">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + Math.max(1, currentPage - 2)
              if (page > totalPages) return null
              
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable, tableVariants, cellVariants }
export type { DataTableProps, Column }