'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase'
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
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      // Get templates from the actual templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true)

      if (templatesError) throw templatesError

      // Note: structured_questions are per-assistant, not per-template
      // so we can't pre-calculate question counts for templates

      // Map templates to expected format
      const templatesWithCounts = templatesData.map(t => ({
        ...t,
        industry: 'real_estate', // Default industry
        question_count: 0 // Will be populated when we have template-question relationships
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
    
    // Since we don't have template_questions table, pass empty questions for now
    // In the future, this could be populated from customizable_fields in templates
    const questions: any[] = []

    onSelectTemplate(templateId, questions)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="h-3 w-3 bg-blue-400 rounded-full"></span>
          Choose a Template
        </h2>
        <p className="text-gray-400 mt-2">
          Start with a pre-configured template or build from scratch
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {templates.map((template) => (
          <Card 
            key={template.id} 
            className={`vm-card transition-all duration-300 cursor-pointer ${
              selectedTemplate === template.id 
                ? 'ring-2 ring-orange-400 bg-gradient-to-br from-orange-900/20 to-gray-900' 
                : 'hover:ring-1 hover:ring-gray-600'
            }`}
            onClick={() => handleSelectTemplate(template.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-orange-400" />
                {selectedTemplate === template.id && (
                  <CheckCircle2 className="h-5 w-5 text-orange-400" />
                )}
              </div>
              <CardTitle className="text-white">{template.name}</CardTitle>
              <CardDescription className="text-gray-400">{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {template.industry}
                </Badge>
                <Badge variant="outline" className="border-gray-600 text-gray-300">
                  <FileText className="mr-1 h-3 w-3" />
                  {template.question_count} questions
                </Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleSelectTemplate(template.id)}
                className={
                  selectedTemplate === template.id 
                    ? 'w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                    : 'w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
              >
                {selectedTemplate === template.id ? 'Selected' : 'Use Template'}
              </Button>
            </CardFooter>
          </Card>
        ))}

        {/* Start from Scratch option */}
        <Card className="vm-card hover:ring-1 hover:ring-gray-600 cursor-pointer" onClick={onSkip}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <CardTitle className="text-white">Start from Scratch</CardTitle>
            <CardDescription className="text-gray-400">
              Build your assistant from the ground up with custom configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="border-gray-600 text-gray-400">No template</Badge>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={onSkip} 
              variant="outline" 
              className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Start Fresh
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}