'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Sparkles, Users, ShoppingCart, Building, Zap, Star } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { Database } from '@/types/database'

type Template = Database['public']['Tables']['templates']['Row']

interface TemplateCardProps {
  template: Template
  onClick: () => void
}

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, { icon: any, emoji: string }> = {
    'Sales': { icon: Zap, emoji: '💰' },
    'Support': { icon: Users, emoji: '🎧' },
    'E-commerce': { icon: ShoppingCart, emoji: '🛒' },
    'Real Estate': { icon: Building, emoji: '🏠' },
    'Lead Generation': { icon: Star, emoji: '🎯' },
    'Customer Service': { icon: Users, emoji: '🤝' }
  }
  return iconMap[category] || { icon: Sparkles, emoji: '✨' }
}

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Sales': 'emerald',
    'Support': 'violet', 
    'E-commerce': 'orange',
    'Real Estate': 'emerald',
    'Lead Generation': 'orange',
    'Customer Service': 'violet'
  }
  return colorMap[category] || 'orange'
}

const getColorStyles = (color: string) => {
  const colorMap = {
    emerald: {
      bg: 'var(--vm-emerald-pale)',
      text: 'var(--vm-emerald)',
      border: 'var(--vm-emerald)'
    },
    violet: {
      bg: 'var(--vm-violet-pale)',
      text: 'var(--vm-violet)',
      border: 'var(--vm-violet)'
    },
    orange: {
      bg: 'var(--vm-orange-pale)',
      text: 'var(--vm-orange-primary)',
      border: 'var(--vm-orange-primary)'
    }
  }
  return colorMap[color as keyof typeof colorMap] || colorMap.orange
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  const categoryInfo = getCategoryIcon('general')
  const categoryColor = getCategoryColor('general')
  const colorStyles = getColorStyles(categoryColor)
  const IconComponent = categoryInfo.icon

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 border-0"
      style={{
        background: 'var(--vm-surface)',
        borderRadius: '16px'
      }}
      onClick={onClick}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
            style={{ background: 'var(--vm-gradient-brand)' }}
          >
            <span className="text-xl">{categoryInfo.emoji}</span>
          </div>
          <Badge 
            className="px-3 py-1 text-xs"
            style={{ 
              background: colorStyles.bg,
              color: colorStyles.text,
              border: `1px solid ${colorStyles.border}`
            }}
          >
            Template
          </Badge>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold vm-text-primary group-hover:text-orange-400 transition-colors">
            {template.name}
          </h3>
          <p className="text-sm vm-text-secondary leading-relaxed line-clamp-3">
            {template.description || 'Professional template for creating effective voice assistants'}
          </p>
        </div>

        {/* Features Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <IconComponent className="w-4 h-4" style={{ color: colorStyles.text }} />
            <span className="text-xs font-medium" style={{ color: colorStyles.text }}>
              Pre-configured template
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 vm-text-muted" />
            <span className="text-xs vm-text-muted">
              Optimized prompts & best practices included
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="pt-2">
          <Button 
            className="w-full h-10 font-medium transition-all duration-200 group-hover:shadow-lg"
            style={{
              background: 'var(--vm-gradient-brand)',
              border: 'none',
              color: 'white'
            }}
          >
            Use This Template
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function TemplateSelector() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.data)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    router.push(`/dashboard/assistants/new/${templateId}`)
  }

  const handleCreateFromScratch = () => {
    router.push('/dashboard/assistants/new/scratch')
  }

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = 'general'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, Template[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--vm-orange-primary)' }} />
          <span className="vm-text-secondary">Loading templates...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Start from Scratch Option */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold vm-text-primary">Create Custom Assistant</h2>
        <Card 
          className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 hover:-translate-y-1 border-0"
          style={{
            background: 'var(--vm-surface)',
            borderRadius: '16px'
          }}
          onClick={handleCreateFromScratch}
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                style={{ background: 'var(--vm-gradient-surface)' }}
              >
                <Plus className="w-8 h-8" style={{ color: 'var(--vm-orange-primary)' }} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold vm-text-primary group-hover:text-orange-400 transition-colors">
                  Start from Scratch
                </h3>
                <p className="text-sm vm-text-secondary leading-relaxed">
                  Build your AI voice assistant from scratch with full customization. Perfect for unique use cases or when you want complete control over every aspect.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--vm-orange-primary)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--vm-orange-primary)' }}>
                    Full customization available
                  </span>
                </div>
              </div>
              <Button 
                className="h-10 px-6 font-medium transition-all duration-200 group-hover:shadow-lg"
                style={{
                  background: 'var(--vm-gradient-brand)',
                  border: 'none',
                  color: 'white'
                }}
              >
                Create Custom
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Template Categories */}
      {Object.keys(templatesByCategory).length > 0 ? (
        Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
          const categoryInfo = getCategoryIcon(category)
          const categoryColor = getCategoryColor(category)
          const colorStyles = getColorStyles(categoryColor)
          const IconComponent = categoryInfo.icon

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: colorStyles.bg }}
                >
                  <IconComponent className="w-4 h-4" style={{ color: colorStyles.text }} />
                </div>
                <h2 className="text-xl font-bold vm-text-primary">{category} Templates</h2>
                <Badge 
                  className="px-2 py-1 text-xs"
                  style={{ 
                    background: colorStyles.bg,
                    color: colorStyles.text,
                    border: `1px solid ${colorStyles.border}`
                  }}
                >
                  {categoryTemplates.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => handleTemplateSelect(template.id)}
                  />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="text-center py-12">
          <div className="space-y-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'var(--vm-surface-elevated)' }}
            >
              <Sparkles className="w-8 h-8 vm-text-muted" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold vm-text-primary">No Templates Available</h3>
              <p className="text-sm vm-text-muted max-w-md mx-auto">
                Templates are being prepared. For now, you can create a custom assistant from scratch.
              </p>
            </div>
            <Button 
              onClick={handleCreateFromScratch}
              className="h-10 px-6 font-medium"
              style={{
                background: 'var(--vm-gradient-brand)',
                border: 'none',
                color: 'white'
              }}
            >
              Create Custom Assistant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}