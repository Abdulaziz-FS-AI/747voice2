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
  first_message?: string
  first_message_mode: 'assistant-speaks-first' | 'user-speaks-first'
  background_sound: 'off' | 'office'
  structured_questions: StructuredQuestion[]
  evaluation_rubric: EvaluationRubric | null
}



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
    <div className="max-w-6xl mx-auto p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Information - Full width on mobile, half on tablet+ */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Input
                    placeholder="Assistant Name *"
                    {...register('name', { required: 'Assistant name is required' })}
                    className="text-sm"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <Input
                  placeholder="Company Name"
                  {...register('company_name')}
                  className="text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* AI Model */}
          <div>
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelSelector
                  selectedModel={formValues.model_id}
                  onModelSelect={(modelId) => setValue('model_id', modelId)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Voice */}
          <div>
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Voice</CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceSelector
                  selectedVoice={formValues.voice_id}
                  onVoiceSelect={(voiceId) => setValue('voice_id', voiceId)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Personality */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Personality</CardTitle>
              </CardHeader>
              <CardContent>
                <PersonalitySelector
                  selectedTraits={formValues.personality_traits || []}
                  onTraitsChange={(traits) => setValue('personality_traits', traits)}
                  maxSelections={5}
                />
              </CardContent>
            </Card>
          </div>

          {/* First Message */}
          <div className="lg:col-span-2">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">First Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Hello! How can I help you today?"
                  {...register('first_message', { required: 'First message is required' })}
                  rows={3}
                  className="text-sm"
                />
                {errors.first_message && (
                  <p className="text-xs text-red-500 mt-1">{errors.first_message.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call Settings */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Call Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="assistant_speaks_first"
                    checked={formValues.first_message_mode === 'assistant-speaks-first'}
                    onCheckedChange={(checked) => 
                      setValue('first_message_mode', checked ? 'assistant-speaks-first' : 'user-speaks-first')
                    }
                  />
                  <Label htmlFor="assistant_speaks_first" className="text-xs cursor-pointer">
                    Assistant speaks first
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Duration: {Math.floor(formValues.max_call_duration / 60)}:{(formValues.max_call_duration % 60).toString().padStart(2, '0')}</Label>
                  <Slider
                    value={[formValues.max_call_duration]}
                    onValueChange={([value]) => setValue('max_call_duration', value)}
                    max={600}
                    min={30}
                    step={30}
                    className="w-full"
                  />
                </div>

                <Select value={formValues.background_sound} onValueChange={(value) => setValue('background_sound', value as 'off' | 'office')}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Background Sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {backgroundSoundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Data Collection */}
          <div className="lg:col-span-2">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Data Collection</CardTitle>
              </CardHeader>
              <CardContent>
                <StructuredQuestions
                  questions={formValues.structured_questions || []}
                  onQuestionsChange={(questions) => setValue('structured_questions', questions)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Performance Evaluation */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Performance Evaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <EvaluationSelector
                  selectedRubric={formValues.evaluation_rubric}
                  onRubricChange={(rubric) => setValue('evaluation_rubric', rubric)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
            size="sm"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} size="sm">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Assistant
          </Button>
        </div>
      </form>
    </div>
  )
}