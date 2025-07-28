'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

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
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      // Get templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('is_active', true)

      if (templatesError) throw templatesError

      // Get template questions count
      const { data: questionsData, error: questionsError } = await supabase
        .from('template_questions')
        .select('template_id')

      if (questionsError) throw questionsError

      // Count questions per template
      const questionCounts = questionsData.reduce((acc, q) => {
        acc[q.template_id] = (acc[q.template_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Combine data
      const templatesWithCounts = templatesData.map(t => ({
        ...t,
        question_count: questionCounts[t.id] || 0
      }))

      setTemplates(templatesWithCounts)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplate(templateId)
    
    // Load template questions
    const { data: questions, error } = await supabase
      .from('template_questions')
      .select('*')
      .eq('template_id', templateId)
      .order('display_order')

    if (error) {
      console.error('Error loading template questions:', error)
      return
    }

    onSelectTemplate(templateId, questions || [])
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