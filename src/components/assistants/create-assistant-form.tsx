'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Form data interface
interface AssistantFormData {
  name: string
  company_name?: string
  personality: 'professional' | 'friendly' | 'casual'
  system_prompt?: string
  voice_id: string
  max_call_duration: number
  language: string
  first_message?: string
  background_ambiance: string
}

// ElevenLabs Voice options - Premium English voices
const voiceOptions = [
  { 
    id: 'pNInz6obpgDQGcFmaJgB', 
    label: 'Rachel', 
    description: 'American Female - Calm, Professional'
  },
  { 
    id: 'ErXwobaYiN019PkySvjV', 
    label: 'Antoni', 
    description: 'American Male - Warm, Deep'
  },
  { 
    id: 'VR6AewLTigWG4xSOukaG', 
    label: 'Arnold', 
    description: 'American Male - Crisp, Business'
  },
  { 
    id: 'EXAVITQu4vr4xnSDxMaL', 
    label: 'Bella', 
    description: 'American Female - Friendly, Engaging'
  },
  { 
    id: 'MF3mGyEYCl7XYWbV9V6O', 
    label: 'Elli', 
    description: 'American Female - Youthful, Natural'
  },
  { 
    id: 'TxGEqnHWrfWFTfGW9XjX', 
    label: 'Josh', 
    description: 'American Male - Deep, Authoritative'
  }
]

// Language options
const languageOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' }
]

const ambientOptions = [
  { value: 'office', label: 'Office Environment' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'quiet', label: 'Quiet Space' },
  { value: 'outdoor', label: 'Outdoor' }
]

export function CreateAssistantForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AssistantFormData>({
    defaultValues: {
      name: '',
      company_name: '',
      personality: 'professional' as const,
      system_prompt: '',
      voice_id: 'pNInz6obpgDQGcFmaJgB', // Rachel - Professional default
      max_call_duration: 300,
      language: 'en-US',
      first_message: '',
      background_ambiance: 'office'
    }
  })

  // Watch form values for preview
  const formValues = watch()

  const onSubmit = async (data: AssistantFormData) => {
    console.log('Form submitted with data:', data)
    setIsLoading(true)
    
    try {
      // Manual validation
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Assistant name is required')
      }
      
      // Ensure data matches API schema
      const submitData = {
        name: data.name.trim(),
        company_name: data.company_name || undefined,
        personality: data.personality || 'professional',
        system_prompt: data.system_prompt || undefined,
        voice_id: data.voice_id || 'pNInz6obpgDQGcFmaJgB',
        max_call_duration: Number(data.max_call_duration) || 300,
        language: data.language || 'en-US',
        first_message: data.first_message || undefined,
        background_ambiance: data.background_ambiance || 'office'
      }
      
      console.log('Submitting assistant data:', submitData)
      
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()
      console.log('API Response:', result)

      // Check if assistant was created (even if VAPI failed)
      if (result.success || (result.error?.assistantId)) {
        toast({
          title: 'Assistant Created!',
          description: 'Your assistant has been created successfully and saved to the database.',
        })
        // Wait a moment for the toast to show, then redirect
        setTimeout(() => {
          router.push('/dashboard/assistants')
        }, 1000)
      } else {
        throw new Error(result.error?.message || 'Failed to create assistant')
      }
    } catch (error) {
      console.error('Error creating assistant:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create assistant',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Configure the basic details of your AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assistant Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sarah - Real Estate Assistant"
                {...register('name', { required: 'Assistant name is required' })}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name.message || 'This field is required'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                placeholder="e.g., ABC Real Estate"
                {...register('company_name')}
              />
              {errors.company_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.company_name.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality & Voice */}
      <Card>
        <CardHeader>
          <CardTitle>Personality & Voice</CardTitle>
          <CardDescription>
            Choose your assistant's personality and voice characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Personality *</Label>
            <RadioGroup
              value={formValues.personality}
              onValueChange={(value) => setValue('personality', value as 'professional' | 'friendly' | 'casual')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="professional" id="professional" />
                <Label htmlFor="professional" className="cursor-pointer">
                  Professional - Formal, business-focused tone
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friendly" id="friendly" />
                <Label htmlFor="friendly" className="cursor-pointer">
                  Friendly - Warm, approachable, and personable
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="casual" id="casual" />
                <Label htmlFor="casual" className="cursor-pointer">
                  Casual - Relaxed, conversational style
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voice_id">Voice *</Label>
              <Select value={formValues.voice_id} onValueChange={(value) => setValue('voice_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div>
                        <div className="font-medium">{voice.label}</div>
                        <div className="text-xs text-muted-foreground">{voice.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select value={formValues.language} onValueChange={(value) => setValue('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Customize your assistant's behavior and responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system_prompt">Custom Instructions</Label>
            <Textarea
              id="system_prompt"
              placeholder="Provide specific instructions for how your assistant should behave..."
              className="min-h-[100px]"
              {...register('system_prompt')}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add specific instructions to customize your assistant's behavior
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first_message">First Message</Label>
            <Textarea
              id="first_message"
              placeholder="Hello! I'm here to help you. How can I assist you today?"
              {...register('first_message')}
            />
            <p className="text-xs text-muted-foreground">
              The greeting message your assistant will use when starting a conversation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_call_duration">Max Call Duration (seconds) *</Label>
              <Input
                id="max_call_duration"
                type="number"
                min="30"
                max="3600"
                {...register('max_call_duration', { 
                  valueAsNumber: true,
                  required: 'Max call duration is required',
                  min: { value: 30, message: 'Minimum duration is 30 seconds' },
                  max: { value: 3600, message: 'Maximum duration is 3600 seconds' }
                })}
              />
              {errors.max_call_duration && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.max_call_duration.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum duration for calls (30-3600 seconds)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background_ambiance">Background Environment</Label>
              <Select value={formValues.background_ambiance} onValueChange={(value) => setValue('background_ambiance', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {ambientOptions.map((ambient) => (
                    <SelectItem key={ambient.value} value={ambient.value}>
                      {ambient.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Assistant
        </Button>
      </div>
    </form>
  )
}