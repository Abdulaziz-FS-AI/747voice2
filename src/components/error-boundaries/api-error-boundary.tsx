'use client'

import React, { useState, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface APIErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface APIError {
  type: 'network' | 'server' | 'client' | 'timeout';
  message: string;
  status?: number;
  endpoint?: string;
}

/**
 * API-specific error boundary for handling network and API failures
 */
export function APIErrorBoundary({ children, fallback }: APIErrorBoundaryProps) {
  const [error, setError] = useState<APIError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global fetch error handler
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          const apiError: APIError = {
            type: response.status >= 500 ? 'server' : 'client',
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            endpoint: typeof args[0] === 'string' ? args[0] : args[0].url
          };
          
          setError(apiError);
        }
        
        return response;
      } catch (fetchError) {
        const apiError: APIError = {
          type: 'network',
          message: fetchError instanceof Error ? fetchError.message : 'Network error',
          endpoint: typeof args[0] === 'string' ? args[0] : args[0].url
        };
        
        setError(apiError);
        throw fetchError;
      }
    };

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.fetch = originalFetch;
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    if (fallback) {
      return fallback(new Error(error.message), handleRetry);
    }

    return <APIErrorDisplay error={error} onRetry={handleRetry} isOnline={isOnline} />;
  }

  return <>{children}</>;
}

interface APIErrorDisplayProps {
  error: APIError;
  onRetry: () => void;
  isOnline: boolean;
}

function APIErrorDisplay({ error, onRetry, isOnline }: APIErrorDisplayProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return isOnline ? 'Connection Issue' : 'No Internet Connection';
      case 'server':
        return 'Server Error';
      case 'client':
        return 'Request Error';
      case 'timeout':
        return 'Request Timeout';
      default:
        return 'API Error';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return isOnline 
          ? 'Unable to connect to the server. Please check your connection and try again.'
          : 'Please check your internet connection and try again.';
      case 'server':
        return 'The server encountered an error. Our team has been notified and is working on a fix.';
      case 'client':
        return 'There was an issue with your request. Please try again or contact support if the problem persists.';
      case 'timeout':
        return 'The request took too long to complete. Please try again.';
      default:
        return error.message;
    }
  };

  return (
    <Card className="max-w-md mx-auto m-4">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-full text-destructive">
            {getErrorIcon()}
          </div>
          <div>
            <h3 className="font-semibold">{getErrorTitle()}</h3>
            <p className="text-sm text-muted-foreground">
              {getErrorDescription()}
            </p>
          </div>
        </div>

        {error.endpoint && (
          <div className="bg-muted p-2 rounded text-xs mb-4">
            <span className="font-medium">Endpoint:</span> {error.endpoint}
          </div>
        )}

        <Button 
          onClick={onRetry} 
          className="w-full"
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Hook for handling API errors in components
 */
export function useAPIErrorHandler() {
  const [error, setError] = useState<APIError | null>(null);

  const handleAPICall = async <T,>(
    apiCall: () => Promise<T>,
    options: {
      timeout?: number;
      retries?: number;
      onError?: (error: APIError) => void;
    } = {}
  ): Promise<T | null> => {
    const { timeout = 30000, retries = 3, onError } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const result = await apiCall();
        clearTimeout(timeoutId);
        
        setError(null);
        return result;
      } catch (err) {
        const apiError: APIError = {
          type: err instanceof DOMException && err.name === 'AbortError' 
            ? 'timeout' 
            : 'network',
          message: err instanceof Error ? err.message : 'Unknown error'
        };

        if (attempt === retries - 1) {
          setError(apiError);
          onError?.(apiError);
          return null;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return null;
  };

  const clearError = () => setError(null);

  return { error, handleAPICall, clearError };
}