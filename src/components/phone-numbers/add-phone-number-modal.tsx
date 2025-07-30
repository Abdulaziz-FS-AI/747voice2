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

// Form validation schema - Twilio only
const phoneNumberSchema = z.object({
  friendlyName: z.string().min(1, 'Friendly name is required').max(255),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format like +15551234567)'),
  assignedAssistantId: z.string().optional(),
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
      reset()
      setCurrentStep('details')
      setAssistantsFetched(false) // Reset fetch status when modal opens
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
    setIsLoading(true)
    
    try {
      // Prepare the payload for Twilio-only setup
      const payload = {
        phoneNumber: data.phoneNumber,
        friendlyName: data.friendlyName,
        twilioAccountSid: data.twilioAccountSid,
        twilioAuthToken: data.twilioAuthToken,
        assistantId: data.assignedAssistantId || null
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

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Twilio Required:</strong> You must provide your own Twilio credentials to add phone numbers for real calls.
                </AlertDescription>
              </Alert>

            </TabsContent>

            {/* Step 2: Twilio Configuration */}
            <TabsContent value="config" className="space-y-4 mt-6">
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
            </TabsContent>

            {/* Step 3: Assistant Assignment */}
            <TabsContent value="assign" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="assignedAssistantId">Assign to Assistant (Optional)</Label>
                <Select onValueChange={(value) => setValue('assignedAssistantId', value === 'unassigned' ? undefined : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={assistantsLoading ? "Loading assistants..." : "Select an assistant"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">Don&apos;t assign yet</span>
                    </SelectItem>
                    {assistantsLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-muted-foreground">Loading assistants...</span>
                        </div>
                      </SelectItem>
                    ) : (
                      assistants.map((assistant) => (
                        <SelectItem key={assistant.id} value={assistant.id}>
                          <div>
                            <div className="font-medium">{assistant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assistant.agent_name} • {assistant.company_name}
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
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