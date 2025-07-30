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

interface CreateAssistantFormProps {
  templateData?: {
    templateId: string
    questions: any[]
  } | null
  onCancel?: () => void
}

export function CreateAssistantForm({ templateData, onCancel }: CreateAssistantFormProps) {
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
        evaluation_rubric: data.evaluation_rubric || null,
        template_id: templateData?.templateId || undefined
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
    <div className="vm-container min-h-screen" style={{ background: 'var(--vm-void)' }}>
      <form onSubmit={handleSubmit(onSubmit)} className="vm-section-sm">
        {/* Voice Matrix Professional Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-orange-primary)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-orange-primary)' }}></span>
                  Basic Information
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Set up your assistant's identity and basic information</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Input
                    placeholder="Assistant Name *"
                    {...register('name', { required: 'Assistant name is required' })}
                    className="vm-input"
                  />
                  {errors.name && (
                    <p className="text-xs mt-2" style={{ color: 'var(--vm-error)' }}>{errors.name.message}</p>
                  )}
                </div>
                <Input
                  placeholder="Company Name"
                  {...register('company_name')}
                  className="vm-input"
                />
              </CardContent>
            </Card>
          </div>

          {/* AI Model */}
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-cyan)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-cyan)' }}></span>
                  AI Model
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Choose the AI model that best fits your needs</p>
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
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-emerald)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-emerald)' }}></span>
                  Voice
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Select the perfect voice for your assistant</p>
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
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-violet)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-violet)' }}></span>
                  Personality
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Define your assistant's personality traits</p>
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-warning)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-warning)' }}></span>
                  First Message
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">What your assistant says when answering calls</p>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Hello! How can I help you today?"
                  {...register('first_message', { required: 'First message is required' })}
                  rows={3}
                  className="vm-textarea"
                />
                {errors.first_message && (
                  <p className="text-xs mt-2" style={{ color: 'var(--vm-error)' }}>{errors.first_message.message}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call Settings */}
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-info)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-info)' }}></span>
                  Call Settings
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Configure how calls are handled</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="assistant_speaks_first"
                    checked={formValues.first_message_mode === 'assistant-speaks-first'}
                    onCheckedChange={(checked) => 
                      setValue('first_message_mode', checked ? 'assistant-speaks-first' : 'user-speaks-first')
                    }
                    className="vm-focus-ring"
                  />
                  <Label htmlFor="assistant_speaks_first" className="text-sm cursor-pointer" style={{ color: 'var(--vm-gray-100)' }}>
                    Assistant speaks first
                  </Label>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm" style={{ color: 'var(--vm-gray-100)' }}>Duration: {Math.floor(formValues.max_call_duration / 60)}:{(formValues.max_call_duration % 60).toString().padStart(2, '0')}</Label>
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
                  <SelectTrigger className="vm-input text-sm h-11">
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-violet-light)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-violet-light)' }}></span>
                  Structured Questions
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Define questions to extract specific data from conversations</p>
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
          <div className="space-y-6">
            <Card className="vm-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="vm-heading text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--vm-orange-light)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--vm-orange-light)' }}></span>
                  Performance Evaluation
                </CardTitle>
                <p className="vm-text-muted text-xs mt-1">Set up evaluation criteria for calls</p>
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
        <div className="flex justify-end gap-4 pt-8" style={{ borderTop: '1px solid var(--vm-border-subtle)' }}>
          <Button
            type="button"
            onClick={onCancel || (() => router.back())}
            disabled={isLoading}
            className="vm-button-secondary px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="vm-button-primary px-8 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating...' : 'Create Assistant'}
          </Button>
        </div>
      </form>
    </div>
  )
}