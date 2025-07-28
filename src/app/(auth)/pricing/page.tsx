'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'

interface PricingPlan {
  id: string
  name: string
  display_name: string
  description: string
  price_monthly: number
  price_yearly: number
  max_assistants: number
  max_minutes: number
  max_phone_numbers: number
  features: string[]
  sort_order: number
}

export default function PricingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchPricingPlans()
  }, [])

  const fetchPricingPlans = async () => {
    try {
      const response = await fetch('/api/pricing/plans')
      const result = await response.json()
      
      if (result.success) {
        setPlans(result.data.sort((a: PricingPlan, b: PricingPlan) => a.sort_order - b.sort_order))
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load pricing plans',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching pricing plans:', error)
      toast({
        title: 'Error',
        description: 'Failed to load pricing plans',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPlan = (planId: string) => {
    setProcessing(planId)
    
    // Redirect to signup page with selected plan and billing cycle
    const searchParams = new URLSearchParams({
      plan: planId,
      cycle: billingCycle,
    })
    
    router.push(`/auth/signup?${searchParams.toString()}`)
  }

  const formatPrice = (monthly: number, yearly: number) => {
    const price = billingCycle === 'monthly' ? monthly : yearly / 12
    return price.toFixed(0)
  }

  const getYearlySavings = (monthly: number, yearly: number) => {
    const monthlyCost = monthly * 12
    const savings = ((monthlyCost - yearly) / monthlyCost) * 100
    return Math.round(savings)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Voice Matrix Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Transform your customer interactions with AI-powered voice assistants
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <Badge variant="secondary" className="ml-2">
                  Save up to 20%
                </Badge>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative ${
                plan.name === 'professional' 
                  ? 'border-2 border-blue-600 shadow-lg' 
                  : 'border shadow-sm'
              }`}
            >
              {plan.name === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                  {plan.display_name}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.description}
                </CardDescription>
                
                <div className="mt-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      ${formatPrice(plan.price_monthly, plan.price_yearly)}
                    </span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                  
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-gray-500 mt-1">
                      ${plan.price_yearly}/year • Save {getYearlySavings(plan.price_monthly, plan.price_yearly)}%
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">AI Assistants</span>
                    <span className="font-medium">{plan.max_assistants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Minutes/month</span>
                    <span className="font-medium">{plan.max_minutes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone Numbers</span>
                    <span className="font-medium">{plan.max_phone_numbers}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Features Included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={processing === plan.id}
                  className={`w-full ${
                    plan.name === 'professional'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : ''
                  }`}
                >
                  {processing === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    `Get Started with ${plan.display_name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription>
              All plans include a 14-day free trial. No commitment required. 
              Cancel anytime with full refund within the trial period.
            </AlertDescription>
          </Alert>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Need a custom solution? {' '}
            <a href="mailto:support@voicematrix.ai" className="text-blue-600 hover:underline">
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}