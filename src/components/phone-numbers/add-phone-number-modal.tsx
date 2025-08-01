'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Phone, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import type { Database } from '@/types/database-simplified'

type PhoneNumber = Database['public']['Tables']['user_phone_numbers']['Row']
type Assistant = Database['public']['Tables']['user_assistants']['Row']

// Form validation schema - Twilio only
const phoneNumberSchema = z.object({
  friendlyName: z.string().min(1, 'Friendly name is required').max(255),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format like +15551234567)'),
  assignedAssistantId: z.string().min(1, 'Assistant assignment is required'),
  notes: z.string().optional(),
  
  // Required Twilio credentials
  twilioAccountSid: z.string().regex(/^AC[a-fA-f0-9]{32}$/, 'Invalid Twilio Account SID format'),
  twilioAuthToken: z.string().min(32, 'Twilio Auth Token is required'),
})

type PhoneNumberFormData = z.infer<typeof phoneNumberSchema>

interface AddPhoneNumberModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (phoneNumber: PhoneNumber) => void
}

export function AddPhoneNumberModal({ open, onClose, onSuccess }: AddPhoneNumberModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [assistantsLoading, setAssistantsLoading] = useState(false)
  const [assistantsFetched, setAssistantsFetched] = useState(false)
  const [currentStep, setCurrentStep] = useState<'details' | 'config' | 'assign'>('details')

  const form = useForm<PhoneNumberFormData>({
    resolver: zodResolver(phoneNumberSchema),
    defaultValues: {
      friendlyName: '',
      phoneNumber: '',
      assignedAssistantId: '',
      notes: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
    }
  })

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = form

  useEffect(() => {
    if (open) {
      console.log('🚀 [FRONTEND] Modal opened, resetting form...')
      reset({
        friendlyName: '',
        phoneNumber: '',
        assignedAssistantId: '', // Explicitly set to empty string
        notes: '',
        twilioAccountSid: '',
        twilioAuthToken: '',
      })
      setCurrentStep('details')
      setAssistantsFetched(false) // Reset fetch status when modal opens
      console.log('🚀 [FRONTEND] Form reset completed')
    }
  }, [open, reset])

  const fetchAssistants = async () => {
    // Prevent multiple simultaneous requests
    if (assistantsLoading || assistantsFetched) return
    
    setAssistantsLoading(true)
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (data.success) {
        setAssistants(data.data || [])
        setAssistantsFetched(true)
      }
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
    } finally {
      setAssistantsLoading(false)
    }
  }

  // Only fetch assistants when user reaches the assign step
  const handleStepChange = (newStep: 'details' | 'config' | 'assign') => {
    setCurrentStep(newStep)
    
    // Lazy load assistants only when user goes to assign step
    if (newStep === 'assign' && !assistantsFetched) {
      fetchAssistants()
    }
  }

  const onSubmit = async (data: PhoneNumberFormData) => {
    console.log('🚀 [FRONTEND] Form submission started')
    console.log('🚀 [FRONTEND] Raw form data:', {
      friendlyName: data.friendlyName,
      phoneNumber: data.phoneNumber,
      assignedAssistantId: data.assignedAssistantId,
      assignedAssistantIdType: typeof data.assignedAssistantId,
      assignedAssistantIdLength: data.assignedAssistantId?.length,
      isAssistantIdEmpty: data.assignedAssistantId === '',
      isAssistantIdUndefined: data.assignedAssistantId === undefined,
      isAssistantIdNull: data.assignedAssistantId === null
    })
    
    setIsLoading(true)
    let result: any = null
    
    try {
      // Critical validation check before API call
      if (!data.assignedAssistantId || data.assignedAssistantId.trim() === '') {
        console.error('🚀 [FRONTEND] ❌ AssistantId is empty or missing!')
        toast({
          title: 'Error',
          description: 'Please select an assistant before creating the phone number.',
          variant: 'destructive',
        })
        return
      }
      
      // UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(data.assignedAssistantId)) {
        console.error('🚀 [FRONTEND] ❌ AssistantId is not a valid UUID format!')
        console.error('🚀 [FRONTEND] Invalid UUID value:', data.assignedAssistantId)
        toast({
          title: 'Error',
          description: 'Selected assistant ID is not valid. Please select a different assistant.',
          variant: 'destructive',
        })
        return
      }
      
      console.log('🚀 [FRONTEND] ✅ AssistantId validation passed')
      
      // Prepare the payload for Twilio-only setup
      const payload = {
        phoneNumber: data.phoneNumber,
        friendlyName: data.friendlyName,
        twilioAccountSid: data.twilioAccountSid,
        twilioAuthToken: data.twilioAuthToken,
        assistantId: data.assignedAssistantId
      }

      console.log('🚀 [FRONTEND] Final payload being sent:', {
        ...payload,
        twilioAuthToken: '[REDACTED]',
        assistantIdType: typeof payload.assistantId,
        assistantIdValue: payload.assistantId,
        assistantIdLength: payload.assistantId?.length
      })

      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      result = await response.json()
      console.log('API Response:', result)

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      toast({
        title: 'Success!',
        description: 'Phone number added successfully.',
      })

      onSuccess(result.data)
      onClose()
    } catch (error) {
      console.error('Error adding phone number:', error)
      console.error('Full API Response:', result)
      
      let errorMessage = 'Failed to add phone number'
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (result?.error) {
        errorMessage = result.error.message || result.error.code || errorMessage
        console.error('API Error Details:', result.error)
      }
      
      // In development, show more detailed error info
      if (process.env.NODE_ENV === 'development' && result?.error?.details) {
        console.error('Error Details:', result.error.details)
        errorMessage += ` (${JSON.stringify(result.error.details)})`
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 'details') handleStepChange('config')
    else if (currentStep === 'config') handleStepChange('assign')
  }

  const prevStep = () => {
    if (currentStep === 'assign') handleStepChange('config')
    else if (currentStep === 'config') handleStepChange('details')
  }

  const canProceedToConfig = () => {
    const friendlyName = watch('friendlyName')
    const phoneNumber = watch('phoneNumber')
    
    return friendlyName && phoneNumber
  }

  const canProceedToAssign = () => {
    // For Twilio, need credentials
    
    const accountSid = watch('twilioAccountSid')
    const authToken = watch('twilioAuthToken')
    
    return accountSid && authToken
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl" style={{
        background: 'var(--vm-surface)',
        borderRadius: '16px'
      }}>
        <DialogHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" 
               style={{ background: 'var(--vm-gradient-brand)' }}>
            <Phone className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold vm-text-primary">
            Connect Your Phone Number
          </DialogTitle>
          <DialogDescription className="text-center vm-text-secondary leading-relaxed">
            Add a phone number to receive calls through your AI assistants
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={currentStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl p-1" style={{
              background: 'var(--vm-background)',
              border: '1px solid var(--vm-border-subtle)'
            }}>
              <TabsTrigger 
                value="details" 
                disabled={currentStep !== 'details'}
                className="rounded-lg font-medium transition-all duration-200"
                style={{
                  color: currentStep === 'details' ? 'white' : 'var(--vm-text-secondary)',
                  background: currentStep === 'details' ? 'var(--vm-gradient-brand)' : 'transparent'
                }}
              >
                Details
              </TabsTrigger>
              <TabsTrigger 
                value="config" 
                disabled={currentStep !== 'config' && currentStep !== 'assign'}
                className="rounded-lg font-medium transition-all duration-200"
                style={{
                  color: currentStep === 'config' ? 'white' : 'var(--vm-text-secondary)',
                  background: currentStep === 'config' ? 'var(--vm-gradient-brand)' : 'transparent'
                }}
              >
                Configuration
              </TabsTrigger>
              <TabsTrigger 
                value="assign" 
                disabled={currentStep !== 'assign'}
                className="rounded-lg font-medium transition-all duration-200"
                style={{
                  color: currentStep === 'assign' ? 'white' : 'var(--vm-text-secondary)', 
                  background: currentStep === 'assign' ? 'var(--vm-gradient-brand)' : 'transparent'
                }}
              >
                Assignment
              </TabsTrigger>
            </TabsList>

            {/* Step 1: Basic Details */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="space-y-3">
                <Label htmlFor="friendlyName" className="text-sm font-semibold vm-text-primary">
                  Friendly Name *
                </Label>
                <Input
                  id="friendlyName"
                  placeholder="e.g., Main Sales Line, Support Line"
                  className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
                  style={{
                    background: 'var(--vm-background)',
                    border: '1px solid var(--vm-border-subtle)',
                    color: 'var(--vm-text-primary)'
                  }}
                  {...register('friendlyName')}
                />
                {errors.friendlyName && (
                  <p className="text-sm text-red-400">{errors.friendlyName.message}</p>
                )}
                <p className="text-xs vm-text-muted">
                  A name for your own reference
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phoneNumber" className="text-sm font-semibold vm-text-primary">
                  Phone Number *
                </Label>
                <Input
                  id="phoneNumber"
                  placeholder="+15017122661"
                  className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
                  style={{
                    background: 'var(--vm-background)',
                    border: '1px solid var(--vm-border-subtle)',
                    color: 'var(--vm-text-primary)'
                  }}
                  {...register('phoneNumber')}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-400">{errors.phoneNumber.message}</p>
                )}
                <p className="text-xs vm-text-muted">
                  Use E.164 format (include country code)
                </p>
              </div>

              <div className="rounded-xl p-4 border" style={{
                background: 'var(--vm-orange-pale)',
                borderColor: 'var(--vm-orange-primary)',
                borderWidth: '1px'
              }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                       style={{ background: 'var(--vm-orange-primary)' }}>
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--vm-orange-primary)' }}>
                      Twilio Required
                    </p>
                    <p className="text-sm vm-text-secondary mt-1">
                      You must provide your own Twilio credentials to add phone numbers for real calls.
                    </p>
                  </div>
                </div>
              </div>

            </TabsContent>

            {/* Step 2: Twilio Configuration */}
            <TabsContent value="config" className="space-y-6 mt-6">
              <div className="rounded-xl p-4 border" style={{
                background: 'var(--vm-orange-pale)',
                borderColor: 'var(--vm-orange-primary)',
                borderWidth: '1px'
              }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                       style={{ background: 'var(--vm-orange-primary)' }}>
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--vm-orange-primary)' }}>
                      Twilio Setup
                    </p>
                    <p className="text-sm vm-text-secondary mt-1">
                      You'll need your Twilio credentials. Find these on your Twilio Console dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="twilioAccountSid" className="text-sm font-semibold vm-text-primary">
                  Twilio Account SID *
                </Label>
                <Input
                  id="twilioAccountSid"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
                  style={{
                    background: 'var(--vm-background)',
                    border: '1px solid var(--vm-border-subtle)',
                    color: 'var(--vm-text-primary)'
                  }}
                  {...register('twilioAccountSid')}
                />
                {errors.twilioAccountSid && (
                  <p className="text-sm text-red-400">{errors.twilioAccountSid.message}</p>
                )}
                <p className="text-xs vm-text-muted">
                  You can find this on your main Twilio Console dashboard
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="twilioAuthToken" className="text-sm font-semibold vm-text-primary">
                  Twilio Auth Token *
                </Label>
                <div className="relative">
                  <Input
                    id="twilioAuthToken"
                    type={showAuthToken ? 'text' : 'password'}
                    placeholder="Your Twilio Auth Token"
                    className="h-12 rounded-xl pr-12 transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
                    style={{
                      background: 'var(--vm-background)',
                      border: '1px solid var(--vm-border-subtle)',
                      color: 'var(--vm-text-primary)'
                    }}
                    {...register('twilioAuthToken')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowAuthToken(!showAuthToken)}
                  >
                    {showAuthToken ? (
                      <EyeOff className="h-4 w-4" style={{ color: 'var(--vm-text-muted)' }} />
                    ) : (
                      <Eye className="h-4 w-4" style={{ color: 'var(--vm-text-muted)' }} />
                    )}
                  </Button>
                </div>
                {errors.twilioAuthToken && (
                  <p className="text-sm text-red-400">{errors.twilioAuthToken.message}</p>
                )}
                <p className="text-xs vm-text-muted">
                  Found next to your Account SID. Treat this like a password.
                </p>
              </div>
            </TabsContent>

            {/* Step 3: Assistant Assignment */}
            <TabsContent value="assign" className="space-y-6 mt-6">
              <div className="space-y-3">
                <Label htmlFor="assignedAssistantId" className="text-sm font-semibold vm-text-primary">
                  Assign to Assistant *
                </Label>
                <Select 
                  value={watch('assignedAssistantId') || ''} 
                  onValueChange={(value) => {
                    console.log('🚀 [FRONTEND] Assistant selected:', {
                      selectedValue: value,
                      valueType: typeof value,
                      valueLength: value?.length
                    })
                    setValue('assignedAssistantId', value)
                  }}
                >
                  <SelectTrigger className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20" style={{
                    background: 'var(--vm-background)',
                    border: '1px solid var(--vm-border-subtle)',
                    color: 'var(--vm-text-primary)'
                  }}>
                    <SelectValue placeholder={assistantsLoading ? "Loading assistants..." : "Choose an assistant *"} />
                  </SelectTrigger>
                  <SelectContent style={{
                    background: 'var(--vm-surface)',
                    border: '1px solid var(--vm-border-subtle)',
                    borderRadius: '12px'
                  }}>
                    {assistantsLoading ? (
                      <SelectItem value="loading" disabled className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--vm-orange-primary)' }} />
                          <span className="vm-text-muted">Loading assistants...</span>
                        </div>
                      </SelectItem>
                    ) : (
                      assistants.map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id} className="rounded-lg">
                          <div>
                            <div className="font-medium vm-text-primary">{assistant.name}</div>
                            <div className="text-xs vm-text-muted">
                              {(assistant.config as any)?.companyName || 'AI Voice Agent'} • {(assistant.config as any)?.personality || 'Professional'}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.assignedAssistantId && (
                  <p className="text-sm text-red-400">{errors.assignedAssistantId.message}</p>
                )}
                <p className="text-xs vm-text-muted">
                  Assistant assignment is required to create a phone number
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="notes" className="text-sm font-semibold vm-text-primary">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this phone number..."
                  rows={3}
                  className="rounded-xl resize-none transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
                  style={{
                    background: 'var(--vm-background)',
                    border: '1px solid var(--vm-border-subtle)',
                    color: 'var(--vm-text-primary)'
                  }}
                  {...register('notes')}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--vm-border-subtle)' }}>
            <div className="flex justify-between w-full">
              <div>
                {currentStep !== 'details' && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={prevStep}
                    className="h-12 px-6 rounded-xl font-medium"
                    style={{
                      borderColor: 'var(--vm-border-subtle)',
                      color: 'var(--vm-text-secondary)',
                      background: 'transparent'
                    }}
                  >
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="h-12 px-6 rounded-xl font-medium"
                  style={{
                    borderColor: 'var(--vm-border-subtle)',
                    color: 'var(--vm-text-secondary)',
                    background: 'transparent'
                  }}
                >
                  Cancel
                </Button>
                
                {currentStep === 'details' && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!canProceedToConfig()}
                    className="h-12 px-6 rounded-xl font-semibold text-white"
                    style={{ 
                      background: !canProceedToConfig() ? 'var(--vm-surface-elevated)' : 'var(--vm-gradient-brand)',
                      border: 'none',
                      opacity: !canProceedToConfig() ? 0.5 : 1
                    }}
                  >
                    Next
                  </Button>
                )}
                
                {currentStep === 'config' && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!canProceedToAssign()}
                    className="h-12 px-6 rounded-xl font-semibold text-white"
                    style={{ 
                      background: !canProceedToAssign() ? 'var(--vm-surface-elevated)' : 'var(--vm-gradient-brand)',
                      border: 'none',
                      opacity: !canProceedToAssign() ? 0.5 : 1
                    }}
                  >
                    Next
                  </Button>
                )}
                
                {currentStep === 'assign' && (
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="h-12 px-6 rounded-xl font-semibold text-white"
                    style={{ 
                      background: isLoading ? 'var(--vm-surface-elevated)' : 'var(--vm-gradient-brand)',
                      border: 'none',
                      opacity: isLoading ? 0.8 : 1
                    }}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Connect
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}