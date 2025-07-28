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
import type { Database } from '@/types/database'

type PhoneNumber = Database['public']['Tables']['phone_numbers']['Row']
type Assistant = Database['public']['Tables']['assistants']['Row']

// Form validation schema
const phoneNumberSchema = z.object({
  friendlyName: z.string().min(1, 'Friendly name is required').max(255),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format like +15551234567)'),
  provider: z.enum(['testing', 'twilio']),
  assignedAssistantId: z.string().optional(),
  notes: z.string().optional(),
  
  // Twilio-specific fields
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
})

// Conditional validation for Twilio
const twilioPhoneNumberSchema = phoneNumberSchema.extend({
  twilioAccountSid: z.string().regex(/^AC[a-fA-f0-9]{32}$/, 'Invalid Twilio Account SID format'),
  twilioAuthToken: z.string().min(32, 'Invalid Twilio Auth Token'),
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
  const [currentStep, setCurrentStep] = useState<'details' | 'config' | 'assign'>('details')
  const [selectedProvider, setSelectedProvider] = useState<'testing' | 'twilio'>('testing')

  const form = useForm<PhoneNumberFormData>({
    resolver: zodResolver(selectedProvider === 'twilio' ? twilioPhoneNumberSchema : phoneNumberSchema),
    defaultValues: {
      friendlyName: '',
      phoneNumber: '',
      provider: 'testing',
      assignedAssistantId: '',
      notes: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
    }
  })

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = form
  const watchedProvider = watch('provider')

  useEffect(() => {
    if (open) {
      fetchAssistants()
      reset()
      setCurrentStep('details')
      setSelectedProvider('testing')
    }
  }, [open, reset])

  useEffect(() => {
    setSelectedProvider(watchedProvider as 'testing' | 'twilio')
  }, [watchedProvider])

  const fetchAssistants = async () => {
    try {
      const response = await fetch('/api/assistants')
      const data = await response.json()
      if (data.success) {
        setAssistants(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch assistants:', error)
    }
  }

  const onSubmit = async (data: PhoneNumberFormData) => {
    setIsLoading(true)
    
    try {
      // Prepare the payload
      const payload = {
        friendly_name: data.friendlyName,
        phone_number: data.phoneNumber,
        provider: data.provider,
        assigned_assistant_id: data.assignedAssistantId || null,
        notes: data.notes || null,
        provider_config: data.provider === 'twilio' ? {
          account_sid: data.twilioAccountSid,
          auth_token: data.twilioAuthToken,
          webhook_url: `${window.location.origin}/api/webhooks/twilio`
        } : {}
      }

      const response = await fetch('/api/phone-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to add phone number')
      }

      toast({
        title: 'Success!',
        description: 'Phone number added successfully.',
      })

      onSuccess(result.data)
      onClose()
    } catch (error) {
      console.error('Error adding phone number:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add phone number',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep === 'details') setCurrentStep('config')
    else if (currentStep === 'config') setCurrentStep('assign')
  }

  const prevStep = () => {
    if (currentStep === 'assign') setCurrentStep('config')
    else if (currentStep === 'config') setCurrentStep('details')
  }

  const canProceedToConfig = () => {
    const friendlyName = watch('friendlyName')
    const phoneNumber = watch('phoneNumber')
    const provider = watch('provider')
    
    return friendlyName && phoneNumber && provider
  }

  const canProceedToAssign = () => {
    if (selectedProvider === 'testing') return true
    
    const accountSid = watch('twilioAccountSid')
    const authToken = watch('twilioAuthToken')
    
    return accountSid && authToken
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Connect Your Phone Number
          </DialogTitle>
          <DialogDescription>
            Add a phone number to receive calls through your AI assistants
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={currentStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" disabled={currentStep !== 'details'}>Details</TabsTrigger>
              <TabsTrigger value="config" disabled={currentStep !== 'config' && currentStep !== 'assign'}>Configuration</TabsTrigger>
              <TabsTrigger value="assign" disabled={currentStep !== 'assign'}>Assignment</TabsTrigger>
            </TabsList>

            {/* Step 1: Basic Details */}
            <TabsContent value="details" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="friendlyName">Friendly Name *</Label>
                <Input
                  id="friendlyName"
                  placeholder="e.g., Main Sales Line, Support Line"
                  {...register('friendlyName')}
                />
                {errors.friendlyName && (
                  <p className="text-sm text-destructive">{errors.friendlyName.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  A name for your own reference
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+15017122661"
                  {...register('phoneNumber')}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use E.164 format (include country code)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider">Provider *</Label>
                <Select onValueChange={(value) => setValue('provider', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="testing">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Testing</Badge>
                        <span>Testing Mode (No external provider)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="twilio">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Twilio</Badge>
                        <span>Twilio (Production calls)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedProvider === 'testing' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Testing Mode:</strong> This number will be used for testing only. 
                    You can test calls through the Vapi web interface without external provider setup.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Step 2: Provider Configuration */}
            <TabsContent value="config" className="space-y-4 mt-6">
              {selectedProvider === 'testing' ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Testing Mode Selected</h3>
                  <p className="text-muted-foreground">
                    No additional configuration needed for testing mode.
                    You can proceed to assign this number to an assistant.
                  </p>
                </div>
              ) : (
                // Twilio Configuration
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Twilio Setup:</strong> You&apos;ll need your Twilio credentials. 
                      Find these on your Twilio Console dashboard.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="twilioAccountSid">Twilio Account SID *</Label>
                    <Input
                      id="twilioAccountSid"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      {...register('twilioAccountSid')}
                    />
                    {errors.twilioAccountSid && (
                      <p className="text-sm text-destructive">{errors.twilioAccountSid.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      You can find this on your main Twilio Console dashboard
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twilioAuthToken">Twilio Auth Token *</Label>
                    <div className="relative">
                      <Input
                        id="twilioAuthToken"
                        type={showAuthToken ? 'text' : 'password'}
                        placeholder="Your Twilio Auth Token"
                        {...register('twilioAuthToken')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowAuthToken(!showAuthToken)}
                      >
                        {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.twilioAuthToken && (
                      <p className="text-sm text-destructive">{errors.twilioAuthToken.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Found next to your Account SID. Treat this like a password.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Step 3: Assistant Assignment */}
            <TabsContent value="assign" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="assignedAssistantId">Assign to Assistant (Optional)</Label>
                <Select onValueChange={(value) => setValue('assignedAssistantId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an assistant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <span className="text-muted-foreground">Don&apos;t assign yet</span>
                    </SelectItem>
                    {assistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        <div>
                          <div className="font-medium">{assistant.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {assistant.agent_name} • {assistant.company_name}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You can assign or change this later from the phone numbers table
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this phone number..."
                  rows={3}
                  {...register('notes')}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <div>
                {currentStep !== 'details' && (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                
                {currentStep === 'details' && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!canProceedToConfig()}
                  >
                    Next
                  </Button>
                )}
                
                {currentStep === 'config' && (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    disabled={!canProceedToAssign()}
                  >
                    Next
                  </Button>
                )}
                
                {currentStep === 'assign' && (
                  <Button type="submit" disabled={isLoading}>
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