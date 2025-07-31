'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        
        <p className="text-muted-foreground">
          {process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred. Please try again.'
            : error.message || 'An unexpected error occurred.'}
        </p>
        
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        
        <Button onClick={reset} className="w-full">
          Try again
        </Button>
      </div>
    </div>
  )
}