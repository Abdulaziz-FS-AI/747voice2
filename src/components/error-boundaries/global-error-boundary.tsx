'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Global Error Boundary with comprehensive error handling
 * Catches JavaScript errors anywhere in the component tree
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId
    };

    // Log error for monitoring
    console.error('🚨 Global Error Boundary caught an error:', errorDetails);
    
    // Report to error monitoring service
    this.reportError(errorDetails);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  private reportError = async (errorDetails: any) => {
    try {
      // Send error to monitoring endpoint
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorDetails)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isProduction = process.env.NODE_ENV === 'production';
      const { error, errorInfo, errorId } = this.state;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Error ID for support */}
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Error ID: {errorId}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please include this ID when contacting support
                </p>
              </div>

              {/* Error details (only in development) */}
              {!isProduction && error && (
                <details className="bg-destructive/5 border border-destructive/20 rounded-md p-4">
                  <summary className="cursor-pointer font-medium text-destructive mb-2">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">Error:</p>
                      <pre className="text-xs bg-background p-2 rounded border overflow-auto">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <p className="font-semibold text-sm">Stack Trace:</p>
                        <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo && (
                      <div>
                        <p className="font-semibold text-sm">Component Stack:</p>
                        <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>

              {/* Support information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Need Help?
                </h4>
                <p className="text-sm text-muted-foreground">
                  If this problem persists, please contact our support team with the error ID above.
                  You can also try refreshing the page or clearing your browser cache.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for easier usage
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <GlobalErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </GlobalErrorBoundary>
    );
  };
}