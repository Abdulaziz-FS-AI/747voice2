'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, GripVertical, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { QuestionData } from '@/lib/prompt-builder'

// Form validation schema
const assistantFormSchema = z.object({
  name: z.string().min(1, 'Assistant name is required').max(255),
  agentName: z.string().min(1, 'Agent name is required').max(100),
  companyName: z.string().min(1, 'Company name is required').max(255),
  tone: z.enum(['professional', 'friendly', 'casual']),
  customInstructions: z.string().optional(),
  voiceId: z.string(),
  maxCallDuration: z.number().min(30).max(3600),
  language: z.string(),
  questions: z.array(z.object({
    questionText: z.string().min(1, 'Question is required'),
    answerDescription: z.string().min(1, 'Description is required'),
    structuredFieldName: z.string()
      .min(1, 'Field name is required')
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid field name format'),
    fieldType: z.enum(['string', 'number', 'boolean']),
    isRequired: z.boolean(),
    displayOrder: z.number()
  }))
})

type AssistantFormData = z.infer<typeof assistantFormSchema>

// ElevenLabs Voice options - Premium English voices
const voiceOptions = [
  { 
    id: 'pNInz6obpgDQGcFmaJgB', 
    label: 'Rachel', 
    gender: 'female',
    description: 'Calm, professional American female - Perfect for business calls',
    accent: 'American',
    provider: '11labs'
  },
  { 
    id: 'VR6AewLTigWG4xSOukaG', 
    label: 'Josh', 
    gender: 'male',
    description: 'Deep, confident American male - Great for authority and trust',
    accent: 'American', 
    provider: '11labs'
  },
  { 
    id: '21m00Tcm4TlvDq8ikWAM', 
    label: 'Rachel (Casual)', 
    gender: 'female',
    description: 'Warm, conversational American female - Friendly and approachable',
    accent: 'American',
    provider: '11labs'
  },
  { 
    id: 'AZnzlk1XvdvUeBnXmlld', 
    label: 'Domi', 
    gender: 'female',
    description: 'Strong, confident American female - Professional with personality',
    accent: 'American',
    provider: '11labs'
  },
  { 
    id: 'ErXwobaYiN019PkySvjV', 
    label: 'Antoni', 
    gender: 'male',
    description: 'Smooth, articulate British male - Sophisticated and trustworthy',
    accent: 'British',
    provider: '11labs'
  }
]

export function CreateAssistantForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('basic')

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<AssistantFormData>({
    resolver: zodResolver(assistantFormSchema),
    defaultValues: {
      name: '',
      agentName: '',
      companyName: '',
      tone: 'professional',
      customInstructions: '',
      voiceId: 'pNInz6obpgDQGcFmaJgB', // Rachel - Professional default
      maxCallDuration: 300,
      language: 'en-US',
      questions: []
    }
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'questions'
  })

  // Watch form values for preview
  const formValues = watch()

  const onSubmit = async (data: AssistantFormData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create assistant')
      }

      toast({
        title: 'Success!',
        description: 'Your assistant has been created successfully.',
      })

      router.push(`/dashboard/assistants/${result.data.id}`)
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

  const addQuestion = () => {
    append({
      questionText: '',
      answerDescription: '',
      structuredFieldName: '',
      fieldType: 'string',
      isRequired: false,
      displayOrder: fields.length
    })
  }

  const moveQuestion = (from: number, to: number) => {
    move(from, to)
    // Update display order
    fields.forEach((field, index) => {
      field.displayOrder = index
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Configure the basic details of your AI assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Assistant Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sarah - Real Estate Assistant"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name (AI Persona)</Label>
                <Input
                  id="agentName"
                  placeholder="e.g., Sarah"
                  {...register('agentName')}
                />
                {errors.agentName && (
                  <p className="text-sm text-destructive">{errors.agentName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., ABC Real Estate"
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="voiceId">Voice Selection</Label>
                <Select 
                  value={formValues.voiceId} 
                  onValueChange={(value) => register('voiceId').onChange({ target: { value } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex flex-col py-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{voice.label}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {voice.gender} • {voice.accent}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {voice.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Premium ElevenLabs voices for professional quality
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCallDuration">Max Call Duration (seconds)</Label>
                <Input
                  id="maxCallDuration"
                  type="number"
                  {...register('maxCallDuration', { valueAsNumber: true })}
                />
                {errors.maxCallDuration && (
                  <p className="text-sm text-destructive">{errors.maxCallDuration.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personality & Tone</CardTitle>
              <CardDescription>
                Define how your assistant will interact with callers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Conversation Tone</Label>
                <RadioGroup
                  value={formValues.tone}
                  onValueChange={(value) => register('tone').onChange({ target: { value } })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional" className="font-normal">
                      Professional - Formal and courteous
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="friendly" id="friendly" />
                    <Label htmlFor="friendly" className="font-normal">
                      Friendly - Warm and approachable
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="casual" id="casual" />
                    <Label htmlFor="casual" className="font-normal">
                      Casual - Relaxed and conversational
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions">Custom Instructions (Optional)</Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Add any specific guidelines for your assistant..."
                  rows={4}
                  {...register('customInstructions')}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your assistant will introduce themselves as {formValues.agentName || '[Agent Name]'} from {formValues.companyName || '[Company Name]'} with a {formValues.tone} tone.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Structured Questions</CardTitle>
              <CardDescription>
                Define questions your assistant will ask to collect lead information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No questions added yet. Click &ldquo;Add Question&rdquo; to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="cursor-move">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>Question</Label>
                                <Input
                                  placeholder="What is your full name?"
                                  {...register(`questions.${index}.questionText`)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Field Name</Label>
                                <Input
                                  placeholder="full_name"
                                  {...register(`questions.${index}.structuredFieldName`)}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Answer Description</Label>
                              <Input
                                placeholder="Get the caller's complete name for follow-up"
                                {...register(`questions.${index}.answerDescription`)}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="space-y-2">
                                  <Label>Type</Label>
                                  <Select
                                    value={field.fieldType}
                                    onValueChange={(value) => register(`questions.${index}.fieldType`).onChange({ target: { value } })}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="string">String</SelectItem>
                                      <SelectItem value="number">Number</SelectItem>
                                      <SelectItem value="boolean">Boolean</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`required-${index}`}
                                    checked={field.isRequired}
                                    onCheckedChange={(checked) => register(`questions.${index}.isRequired`).onChange({ target: { value: checked } })}
                                  />
                                  <Label htmlFor={`required-${index}`}>Required</Label>
                                </div>
                              </div>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Review your assistant configuration before creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Basic Information</h3>
                <dl className="text-sm space-y-1">
                  <div>
                    <dt className="inline font-medium">Name:</dt>
                    <dd className="inline ml-2">{formValues.name || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Agent:</dt>
                    <dd className="inline ml-2">{formValues.agentName || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Company:</dt>
                    <dd className="inline ml-2">{formValues.companyName || 'Not set'}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Personality</h3>
                <dl className="text-sm space-y-1">
                  <div>
                    <dt className="inline font-medium">Tone:</dt>
                    <dd className="inline ml-2 capitalize">{formValues.tone}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Voice:</dt>
                    <dd className="inline ml-2">
                      {voiceOptions.find(v => v.id === formValues.voiceId)?.label || 'Not set'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Questions</h3>
                <p className="text-sm text-muted-foreground">
                  {fields.length} question{fields.length !== 1 ? 's' : ''} configured
                  ({fields.filter(q => q.isRequired).length} required)
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
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
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
}