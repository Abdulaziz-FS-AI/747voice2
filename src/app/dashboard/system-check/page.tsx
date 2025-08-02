'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Globe,
  Server,
  Shield,
  Webhook,
  FileCode2
} from 'lucide-react'

interface SystemCheckResult {
  component: string
  status: 'ok' | 'error' | 'warning'
  message: string
  details?: any
}

interface SystemCheckResponse {
  success: boolean
  status: 'ok' | 'error' | 'warning'
  message: string
  summary: {
    total: number
    ok: number
    warnings: number
    errors: number
  }
  results: SystemCheckResult[]
  timestamp: string
}

export default function SystemCheckPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SystemCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSystemCheck = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/system-check')
      const result = await response.json()
      
      if (result.success) {
        setData(result)
      } else {
        setError(result.error?.message || 'System check failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run system check')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runSystemCheck()
  }, [])

  const getIcon = (component: string) => {
    switch (component) {
      case 'Environment Variables': return <Shield className="h-5 w-5" />
      case 'Database Tables': return <Database className="h-5 w-5" />
      case 'Voice Service Connection': return <Globe className="h-5 w-5" />
      case 'Templates': return <FileCode2 className="h-5 w-5" />
      case 'Make.com Webhook': return <Webhook className="h-5 w-5" />
      default: return <Server className="h-5 w-5" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok': return <Badge className="bg-green-100 text-green-800">Operational</Badge>
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      default: return null
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health Check</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive system diagnostics and integration testing
          </p>
        </div>
        <Button 
          onClick={runSystemCheck} 
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Check...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Run Check
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>
                    Last checked: {new Date(data.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
                {getStatusBadge(data.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {getStatusIcon(data.status)}
                <span className="font-medium">{data.message}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.summary.total}</div>
                  <div className="text-xs text-muted-foreground">Total Checks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.summary.ok}</div>
                  <div className="text-xs text-muted-foreground">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{data.summary.warnings}</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{data.summary.errors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Component Results */}
          <div className="grid gap-4">
            {data.results.map((result, index) => (
              <Card key={index} className={
                result.status === 'error' ? 'border-red-200' : 
                result.status === 'warning' ? 'border-yellow-200' : 
                'border-green-200'
              }>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getIcon(result.component)}
                      <CardTitle className="text-lg">{result.component}</CardTitle>
                    </div>
                    {getStatusIcon(result.status)}
                  </div>
                  <CardDescription>{result.message}</CardDescription>
                </CardHeader>
                {result.details && (
                  <CardContent>
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium mb-2">View Details</summary>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Action Items */}
          {(data.summary.errors > 0 || data.summary.warnings > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Steps to resolve issues</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.results
                    .filter(r => r.status === 'error')
                    .map((result, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <span className="font-medium">{result.component}:</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {result.message}
                          </span>
                        </div>
                      </li>
                    ))}
                  {data.results
                    .filter(r => r.status === 'warning')
                    .map((result, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div>
                          <span className="font-medium">{result.component}:</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {result.message}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}