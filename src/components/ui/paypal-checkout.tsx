'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    paypal?: any
  }
}

interface PayPalCheckoutProps {
  planId: string
  onSuccess: (subscriptionId: string) => void
  onError: (error: string) => void
  className?: string
}

export function PayPalCheckout({ planId, onSuccess, onError, className = '' }: PayPalCheckoutProps) {
  const paypalRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPayPalScript = () => {
      // Check if PayPal is already loaded
      if (window.paypal) {
        initializePayPal()
        return
      }

      // Create script element
      const script = document.createElement('script')
      script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`
      script.async = true

      script.onload = () => {
        initializePayPal()
      }

      script.onerror = () => {
        setError('Failed to load PayPal SDK')
        setIsLoading(false)
      }

      document.body.appendChild(script)
    }

    const initializePayPal = () => {
      if (!paypalRef.current || !window.paypal) {
        setError('PayPal SDK not available')
        setIsLoading(false)
        return
      }

      try {
        window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe',
            height: 45
          },
          createSubscription: function(data: any, actions: any) {
            return actions.subscription.create({
              plan_id: planId,
              application_context: {
                brand_name: 'Voice Matrix',
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                payment_method: {
                  payer_selected: 'PAYPAL',
                  payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                },
                return_url: `${window.location.origin}/signup?success=true`,
                cancel_url: `${window.location.origin}/signup?cancelled=true`
              }
            })
          },
          onApprove: function(data: any, actions: any) {
            console.log('Subscription approved:', data)
            onSuccess(data.subscriptionID)
          },
          onCancel: function(data: any) {
            console.log('Subscription cancelled:', data)
            onError('Payment was cancelled')
          },
          onError: function(err: any) {
            console.error('PayPal error:', err)
            onError(err.message || 'Payment failed. Please try again.')
          }
        }).render(paypalRef.current)

        setIsLoading(false)
      } catch (err: any) {
        console.error('Error initializing PayPal:', err)
        setError(err.message || 'Failed to initialize payment')
        setIsLoading(false)
      }
    }

    loadPayPalScript()

    // Cleanup
    return () => {
      // Remove any existing PayPal buttons
      if (paypalRef.current) {
        paypalRef.current.innerHTML = ''
      }
    }
  }, [planId, onSuccess, onError])

  if (error) {
    return (
      <div className={`text-center p-6 vm-surface rounded-xl ${className}`}>
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="vm-text-primary font-medium mb-2">Payment Error</p>
        <p className="vm-text-muted text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="vm-button-secondary mt-4 px-4 py-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="text-center p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 vm-text-primary" />
          <p className="vm-text-muted">Loading secure payment...</p>
        </div>
      )}
      
      <div 
        ref={paypalRef} 
        className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
      />
      
      {!isLoading && (
        <div className="text-center mt-4">
          <p className="text-xs vm-text-muted">
            🔒 Secure payment powered by PayPal
          </p>
        </div>
      )}
    </div>
  )
}