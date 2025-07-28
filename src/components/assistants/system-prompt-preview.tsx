'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PromptBuilder } from '@/lib/prompt-builder'
import type { AssistantCustomization, PromptTemplate } from '@/lib/prompt-builder'

interface SystemPromptPreviewProps {
  templateId?: string
  agentName: string
  companyName: string
  tone: 'professional' | 'friendly' | 'casual'
  customInstructions?: string
  questions: any[]
}

export function SystemPromptPreview({
  templateId,
  agentName,
  companyName,
  tone,
  customInstructions,
  questions
}: SystemPromptPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [template, setTemplate] = useState<PromptTemplate | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [firstMessage, setFirstMessage] = useState('')

  useEffect(() => {
    loadTemplate()
  }, [templateId])

  useEffect(() => {
    generatePrompt()
  }, [template, agentName, companyName, tone, customInstructions, questions])

  const loadTemplate = async () => {
    if (!templateId) return

    try {
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setTemplate(data.data)
      }
    } catch (error) {
      console.error('Error loading template:', error)
    }
  }

  const generatePrompt = () => {
    if (!template || !agentName || !companyName) {
      setGeneratedPrompt('')
      setFirstMessage('')
      return
    }

    try {
      const customization: AssistantCustomization = {
        agentName,
        companyName,
        tone,
        customInstructions,
        questions: questions.map((q, index) => ({
          ...q,
          displayOrder: index
        }))
      }

      const prompt = PromptBuilder.buildSystemPrompt(template, customization)
      const message = PromptBuilder.buildFirstMessage(template, customization)

      setGeneratedPrompt(prompt)
      setFirstMessage(message)
    } catch (error) {
      console.error('Error generating prompt:', error)
      setGeneratedPrompt('Error generating prompt')
    }
  }

  if (!template) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Prompt Preview</CardTitle>
            <CardDescription>
              See how your assistant will be configured
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {showPreview && (
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">First Message</Badge>
            </div>
            <div className="p-3 bg-muted rounded-md text-sm">
              {firstMessage || 'Configure basic info to see preview...'}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">System Prompt</Badge>
              <span className="text-xs text-muted-foreground">
                ({generatedPrompt.length} characters)
              </span>
            </div>
            <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {generatedPrompt || 'Configure basic info to see preview...'}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}