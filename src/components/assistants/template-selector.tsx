'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database-simplified'

interface Template {
  id: string
  name: string
  description: string
  industry: string
  question_count?: number
}

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string, questions: any[]) => void
  onSkip: () => void
}

export function TemplateSelector({ onSelectTemplate, onSkip }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  // Mock templates - no database connection needed

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      // Mock template data
      const mockTemplates = [
        {
          id: '1',
          name: 'Real Estate Agent',
          description: 'Professional real estate assistant template',
          industry: 'Real Estate',
          question_count: 5
        },
        {
          id: '2', 
          name: 'Customer Service',
          description: 'General customer service template',
          industry: 'Service',
          question_count: 3
        }
      ]
      
      setTemplates(mockTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId)
    
    // Mock selection - in real app would load template data
    const selectedTemplate = templates.find(t => t.id === templateId)
    if (selectedTemplate) {
      // Mock questions data
      const mockQuestions: any[] = []
      onSelectTemplate(templateId, mockQuestions)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose a Template</h2>
        <p className="text-muted-foreground mt-2">
          Start with a pre-configured template or build from scratch
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={selectedTemplate === template.id ? 'ring-2 ring-primary' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-primary" />
                {selectedTemplate === template.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{template.industry}</Badge>
                <Badge variant="outline">
                  <FileText className="mr-1 h-3 w-3" />
                  {template.question_count} questions
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleSelectTemplate(template.id)}
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                className="w-full"
              >
                {selectedTemplate === template.id ? 'Selected' : 'Use Template'}
              </Button>
            </CardFooter>
          </Card>
        ))}

        {/* Start from Scratch option */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Start from Scratch</CardTitle>
            <CardDescription>
              Build your assistant from the ground up with custom configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">No template</Badge>
          </CardContent>
          <CardFooter>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Start Fresh
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}