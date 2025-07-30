'use client'

import { useState } from 'react'
import { CreateAssistantForm } from '@/components/assistants/create-assistant-form'
import { TemplateSelector } from '@/components/assistants/template-selector'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewAssistantPage() {
  const [templateData, setTemplateData] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  const handleTemplateSelect = (templateId: string, questions: any[]) => {
    setTemplateData({ templateId, questions })
    setShowForm(true)
  }

  const handleSkipTemplate = () => {
    setTemplateData(null)
    setShowForm(true)
  }

  const handleBack = () => {
    setShowForm(false)
    setTemplateData(null)
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto p-6 space-y-8 max-w-7xl">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800">
            <Link href="/assistants">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="h-3 w-3 bg-orange-500 rounded-full animate-pulse"></span>
              Create Assistant
            </h1>
            <p className="text-gray-400">
              Set up a new AI voice assistant for your business
            </p>
          </div>
        </div>

      {!showForm ? (
        <TemplateSelector 
          onSelectTemplate={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      ) : (
        <div className="space-y-6">
          <Button 
            onClick={handleBack} 
            variant="ghost" 
            size="sm" 
            className="text-orange-400 hover:text-orange-300 hover:bg-gray-800"
          >
            ← Back to Templates
          </Button>
          <CreateAssistantForm 
            templateData={templateData}
            onCancel={handleBack}
          />
        </div>
      )}
      </div>
    </div>
  )
}