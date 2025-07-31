'use client'

import { useRouter } from 'next/navigation'
import { CreateAssistantForm } from '@/components/assistants/create-assistant-form'

export default function NewAssistantPage() {
  const router = useRouter()

  // Use a basic template configuration without requiring template selection
  const basicTemplate = {
    templateId: undefined, // No template ID needed
    name: 'Basic Assistant',
    category: 'general',
    config: {
      personality_traits: ['professional'],
      model_id: 'gpt-4.1-mini-2025-04-14',
      voice_id: 'Elliot',
      max_call_duration: 300,
      first_message: 'Hello! How can I help you today?',
      first_message_mode: 'assistant-speaks-first' as const,
      background_sound: 'office' as const,
      structured_questions: [],
      evaluation_rubric: null,
      client_messages: ['end-of-call-report']
    },
    placeholders: {
      name: '',
      company_name: ''
    }
  }

  return (
    <CreateAssistantForm 
      templateData={basicTemplate}
      onCancel={() => router.push('/dashboard/assistants')}
    />
  )
}