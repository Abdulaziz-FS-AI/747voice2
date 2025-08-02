'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateAssistantForm } from '@/components/assistants/create-assistant-form'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/types/database'

type Template = Database['public']['Tables']['templates']['Row']

export default function NewAssistantWithTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  const templateId = params.templateId as string

  useEffect(() => {
    if (templateId === 'scratch') {
      setTemplate(null)
      setLoading(false)
      return
    }

    fetchTemplate()
  }, [templateId])

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`)
      const data = await response.json()

      if (data.success) {
        setTemplate(data.data)
      } else {
        toast({
          title: 'Error',
          description: 'Template not found',
          variant: 'destructive'
        })
        router.push('/dashboard/assistants/new')
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive'
      })
      router.push('/dashboard/assistants/new')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--vm-orange-primary)' }} />
              <span className="vm-text-secondary">Loading template...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isFromScratch = templateId === 'scratch'

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/assistants/new')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {isFromScratch ? 'Create Custom Assistant' : 'Create Assistant from Template'}
              </h1>
              {template && (
                <Badge 
                  className="px-3 py-1"
                  style={{ 
                    background: 'var(--vm-orange-pale)', 
                    color: 'var(--vm-orange-primary)',
                    border: '1px solid var(--vm-orange-primary)'
                  }}
                >
                  Template
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isFromScratch 
                ? 'Build your AI voice assistant from scratch with full customization'
                : template 
                  ? `Using "${template.name}" template - ${template.description}`
                  : 'Set up your AI voice assistant'
              }
            </p>
          </div>
        </div>

        {/* Template Info Banner */}
        {template && (
          <div 
            className="rounded-xl p-4 border"
            style={{
              background: 'var(--vm-orange-pale)',
              borderColor: 'var(--vm-orange-primary)',
              borderWidth: '1px'
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--vm-orange-primary)' }}
              >
                <span className="text-white text-lg">📋</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--vm-orange-primary)' }}>
                  Template: {template.name}
                </h3>
                <p className="text-sm vm-text-secondary mt-1">
                  This template includes pre-configured settings, structured questions, and best practices. You can customize any aspect before creating your assistant.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <CreateAssistantForm 
          templateData={template ? {
            templateId: template.id,
            name: template.name,
            category: 'Custom',
            config: template.customizable_fields || {},
            placeholders: { name: template.name }
          } : null}
          onCancel={() => router.push('/dashboard/assistants/new')}
        />
      </div>
    </DashboardLayout>
  )
}