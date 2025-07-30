'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ModelSelector } from '@/components/assistants/model-selector'
import { VoiceSelector } from '@/components/assistants/voice-selector'
import { PersonalitySelector } from '@/components/assistants/personality-selector'
import { StructuredQuestions } from '@/components/assistants/structured-questions'
import { EvaluationSelector } from '@/components/assistants/evaluation-selector'
import { StructuredQuestion, EvaluationRubric } from '@/lib/structured-data'

// Form data interface
interface AssistantFormData {
  name: string
  company_name?: string
  personality_traits: string[]
  model_id: string
  voice_id: string
  max_call_duration: number
  language: string
  first_message?: string
  first_message_mode: 'assistant-speaks-first' | 'user-speaks-first'
  background_sound: 'off' | 'office'
  structured_questions: StructuredQuestion[]
  evaluation_rubric: EvaluationRubric | null
}


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

const backgroundSoundOptions = [
  { value: 'off', label: 'No Background Sound' },
  { value: 'office', label: 'Office Environment' }
]

export function CreateAssistantForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<AssistantFormData>({
    defaultValues: {
      name: '',
      company_name: '',
      personality_traits: ['professional'],
      model_id: 'gpt-4.1-mini-2025-04-14', // Default recommended model
      voice_id: 'Elliot', // Default VAPI voice
      max_call_duration: 300, // 5 minutes default
      language: 'en-US',
      first_message: 'Hello! How can I help you today?',
      first_message_mode: 'assistant-speaks-first',
      background_sound: 'office',
      structured_questions: [],
      evaluation_rubric: null
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
        personality: data.personality_traits?.[0] || 'professional', // Use first trait for legacy API
        personality_traits: data.personality_traits || ['professional'],
        model_id: data.model_id || 'gpt-4.1-mini-2025-04-14',
        voice_id: data.voice_id || 'Elliot',
        max_call_duration: Number(data.max_call_duration) || 300,
        language: data.language || 'en-US',
        first_message: data.first_message || 'Hello! How can I help you today?',
        first_message_mode: data.first_message_mode || 'assistant-speaks-first',
        background_sound: data.background_sound || 'office',
        structured_questions: data.structured_questions || [],
        evaluation_rubric: data.evaluation_rubric || null
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

      {/* AI Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>AI Model Selection</CardTitle>
          <CardDescription>
            Choose the AI model that powers your assistant's intelligence and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSelector
            selectedModel={formValues.model_id}
            onModelSelect={(modelId) => setValue('model_id', modelId)}
          />
        </CardContent>
      </Card>

      {/* Personality Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Personality & Traits</CardTitle>
          <CardDescription>
            Define your assistant's character with multiple personality traits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalitySelector
            selectedTraits={formValues.personality_traits || []}
            onTraitsChange={(traits) => setValue('personality_traits', traits)}
            maxSelections={5}
          />
        </CardContent>
      </Card>

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Selection</CardTitle>
          <CardDescription>
            Choose the perfect VAPI voice that represents your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoiceSelector
            selectedVoice={formValues.voice_id}
            onVoiceSelect={(voiceId) => setValue('voice_id', voiceId)}
          />
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Language Settings</CardTitle>
          <CardDescription>
            Configure language and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Call Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Call Configuration</CardTitle>
          <CardDescription>
            Configure call behavior and conversation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* First Message Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="assistant_speaks_first"
                checked={formValues.first_message_mode === 'assistant-speaks-first'}
                onCheckedChange={(checked) => 
                  setValue('first_message_mode', checked ? 'assistant-speaks-first' : 'user-speaks-first')
                }
              />
              <Label htmlFor="assistant_speaks_first" className="cursor-pointer font-medium">
                Assistant speaks first
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              When enabled, the assistant will greet the caller immediately when the call connects
            </p>

            <div className="space-y-2">
              <Label htmlFor="first_message">First Message *</Label>
              <Textarea
                id="first_message"
                placeholder="Hello! How can I help you today?"
                {...register('first_message', { required: 'First message is required' })}
              />
              {errors.first_message && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.first_message.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                The greeting message your assistant will use when starting a conversation
              </p>
            </div>
          </div>

          {/* Call Duration Slider */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_call_duration">Max Call Duration: {Math.floor(formValues.max_call_duration / 60)}:{(formValues.max_call_duration % 60).toString().padStart(2, '0')} minutes</Label>
              <Slider
                value={[formValues.max_call_duration]}
                onValueChange={([value]) => setValue('max_call_duration', value)}
                max={600} // 10 minutes
                min={30}  // 30 seconds
                step={30} // 30 second increments
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>30 seconds</span>
                <span>10 minutes</span>
              </div>
            </div>
          </div>

          {/* Background Sound */}
          <div className="space-y-2">
            <Label htmlFor="background_sound">Background Sound</Label>
            <Select value={formValues.background_sound} onValueChange={(value) => setValue('background_sound', value as 'off' | 'office')}>
              <SelectTrigger>
                <SelectValue placeholder="Select background sound" />
              </SelectTrigger>
              <SelectContent>
                {backgroundSoundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Background sound played during the call. Office provides subtle ambient office sounds.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Structured Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Collection</CardTitle>
          <CardDescription>
            Set up questions to extract specific information from conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StructuredQuestions
            questions={formValues.structured_questions || []}
            onQuestionsChange={(questions) => setValue('structured_questions', questions)}
          />
        </CardContent>
      </Card>

      {/* Call Evaluation */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Evaluation</CardTitle>
          <CardDescription>
            Configure how the AI will evaluate call success and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvaluationSelector
            selectedRubric={formValues.evaluation_rubric}
            onRubricChange={(rubric) => setValue('evaluation_rubric', rubric)}
          />
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