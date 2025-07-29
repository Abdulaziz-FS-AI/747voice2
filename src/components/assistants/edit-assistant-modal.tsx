'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/types/database-simplified'

type Assistant = Database['public']['Tables']['assistants']['Row']

interface EditAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  assistant: Assistant
  onSuccess: (updatedAssistant: Assistant) => void
}

// Available voices from ElevenLabs
const VOICE_OPTIONS = [
  { id: 'burt', name: 'Burt', gender: 'Male', accent: 'American' },
  { id: 'marty', name: 'Marty', gender: 'Male', accent: 'American' },
  { id: 'jennifer', name: 'Jennifer', gender: 'Female', accent: 'American' },
  { id: 'sarah', name: 'Sarah', gender: 'Female', accent: 'American' },
  { id: 'mark', name: 'Mark', gender: 'Male', accent: 'British' }
]

const editAssistantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  company_name: z.string().max(255).optional(),
  personality: z.enum(['professional', 'friendly', 'casual']),
  system_prompt: z.string().optional(),
  voice_id: z.string().optional(),
  max_call_duration: z.number().min(30).max(3600),
  language: z.string(),
  first_message: z.string().optional(),
  background_ambiance: z.string(),
})

type EditAssistantForm = z.infer<typeof editAssistantSchema>

export function EditAssistantModal({ 
  isOpen, 
  onClose, 
  assistant, 
  onSuccess 
}: EditAssistantModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<EditAssistantForm>({
    resolver: zodResolver(editAssistantSchema),
    defaultValues: {
      name: assistant.name,
      company_name: assistant.company_name || '',
      personality: (assistant.personality as 'professional' | 'friendly' | 'casual') || 'professional',
      system_prompt: assistant.system_prompt || '',
      voice_id: assistant.voice_id || 'burt',
      max_call_duration: assistant.max_call_duration || 300,
      language: assistant.language || 'en-US',
      first_message: assistant.first_message || '',
      background_ambiance: assistant.background_ambiance || 'office',
    }
  })

  // Reset form when assistant changes
  useEffect(() => {
    if (assistant) {
      form.reset({
        name: assistant.name,
        company_name: assistant.company_name || '',
        personality: (assistant.personality as 'professional' | 'friendly' | 'casual') || 'professional',
        system_prompt: assistant.system_prompt || '',
        voice_id: assistant.voice_id || 'burt',
        max_call_duration: assistant.max_call_duration || 300,
        language: assistant.language || 'en-US',
        first_message: assistant.first_message || '',
        background_ambiance: assistant.background_ambiance || 'office',
      })
    }
  }, [assistant, form])

  const onSubmit = async (data: EditAssistantForm) => {
    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/assistants/${assistant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update assistant')
      }

      if (result.success) {
        onSuccess(result.data)
        toast({
          title: 'Success',
          description: 'Assistant updated successfully'
        })
      } else {
        throw new Error(result.error?.message || 'Failed to update assistant')
      }
    } catch (error) {
      console.error('Failed to update assistant:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update assistant',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      form.reset()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Assistant
            <Badge variant="outline">{assistant.name}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assistant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sarah - Real Estate Expert" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Premium Real Estate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Personality & Voice */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personality & Voice</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <FormField
                  control={form.control}
                  name="personality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="voice_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VOICE_OPTIONS.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.name} ({voice.gender}, {voice.accent})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="max_call_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Call Duration (seconds)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={30} 
                          max={3600} 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="background_ambiance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Ambiance</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || 'office'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="quiet">Quiet</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Messages</h3>
              
              <FormField
                control={form.control}
                name="first_message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Hi! This is Sarah from Premium Real Estate. How can I help you today?"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="system_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional instructions for the assistant..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Assistant
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}