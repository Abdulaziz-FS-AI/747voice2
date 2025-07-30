'use client'

import { useState, useMemo } from 'react'
import { Search, Zap, Clock, DollarSign, Star, Filter } from 'lucide-react'
import { 
  MODEL_OPTIONS, 
  MODEL_CATEGORIES, 
  ModelOption, 
  ModelCategory, 
  getModelsByCategory,
  getFastestModels,
  getCheapestModels,
  getRecommendedModels,
  searchModels 
} from '@/lib/models'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ModelSelectorProps {
  selectedModel?: string
  onModelSelect: (modelId: string) => void
  className?: string
}

type FilterType = 'all' | 'recommended' | 'fastest' | 'cheapest'

export function ModelSelector({ selectedModel, onModelSelect, className }: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'all'>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')

  // Filter models based on search, category, and filter type
  const filteredModels = useMemo(() => {
    let models = MODEL_OPTIONS

    // Apply search filter
    if (searchQuery) {
      models = searchModels(searchQuery)
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      models = models.filter(model => model.category === selectedCategory)
    }

    // Apply special filters
    switch (filterType) {
      case 'recommended':
        models = models.filter(model => model.recommended)
        break
      case 'fastest':
        models = models.filter(model => model.tags.includes('fastest'))
        break
      case 'cheapest':
        models = models.filter(model => model.tags.includes('cheapest'))
        break
    }

    return models
  }, [searchQuery, selectedCategory, filterType])

  // Group models by category
  const groupedModels = useMemo(() => {
    const groups: Record<ModelCategory, ModelOption[]> = {
      'gpt-4.1': [],
      'gpt-4o': [],
      'specialized': [],
      'realtime': [],
      'budget': [],
      'regional': []
    }

    filteredModels.forEach(model => {
      groups[model.category].push(model)
    })

    // Sort each group by recommended, then by latency
    Object.keys(groups).forEach(category => {
      groups[category as ModelCategory].sort((a, b) => {
        if (a.recommended && !b.recommended) return -1
        if (!a.recommended && b.recommended) return 1
        return a.latency - b.latency
      })
    })

    return groups
  }, [filteredModels])

  const getLatencyColor = (latency: number) => {
    if (latency < 300) return 'var(--vm-success)'
    if (latency < 600) return 'var(--vm-warning)'
    return 'var(--vm-error)'
  }

  const getCostColor = (cost: number) => {
    if (cost < 0.01) return 'var(--vm-success)'
    if (cost < 0.02) return 'var(--vm-warning)'
    return 'var(--vm-error)'
  }

  const renderModelCard = (model: ModelOption) => {
    const isSelected = selectedModel === model.id
    const categoryInfo = MODEL_CATEGORIES[model.category]

    return (
      <div
        key={model.id}
        className={`
          relative p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:scale-[1.02]
          ${isSelected 
            ? 'vm-glow border-[var(--vm-primary)] bg-gradient-to-br from-[var(--vm-primary)]/10 to-transparent' 
            : 'border-[var(--vm-border)] bg-[var(--vm-surface)] hover:border-[var(--vm-primary)]/50'
          }
        `}
        style={{
          background: isSelected 
            ? `linear-gradient(135deg, ${categoryInfo.color}15 0%, transparent 100%)`
            : 'var(--vm-surface)'
        }}
        onClick={() => onModelSelect(model.id)}
      >
        {/* Badge */}
        {model.badge && (
          <div className="absolute -top-2 -right-2">
            <Badge 
              className="text-xs font-bold px-2 py-1"
              style={{
                background: model.badge === 'FASTEST' ? 'var(--vm-success)' :
                           model.badge === 'CHEAPEST' ? 'var(--vm-warning)' :
                           model.badge === 'NEW' ? 'var(--vm-accent)' :
                           'var(--vm-primary)',
                color: 'var(--vm-background)'
              }}
            >
              {model.badge}
            </Badge>
          </div>
        )}

        {/* Category Icon */}
        <div className="flex items-start gap-3 mb-3">
          <div 
            className="h-10 w-10 rounded-lg flex items-center justify-center text-lg"
            style={{ background: `${categoryInfo.color}20` }}
          >
            {categoryInfo.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[var(--vm-text-primary)] mb-1 truncate">
              {model.displayName}
            </h3>
            <p className="text-xs text-[var(--vm-text-secondary)] line-clamp-2">
              {model.description}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: getLatencyColor(model.latency) }} />
            <span className="text-sm font-medium" style={{ color: getLatencyColor(model.latency) }}>
              {model.latency}ms
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" style={{ color: getCostColor(model.costPer1k) }} />
            <span className="text-sm font-medium" style={{ color: getCostColor(model.costPer1k) }}>
              ${model.costPer1k}/1k
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {model.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div 
            className="absolute inset-0 rounded-xl border-2 pointer-events-none"
            style={{ borderColor: 'var(--vm-primary)' }}
          />
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="vm-heading text-2xl font-bold mb-2">Select AI Model</h2>
        <p className="vm-text-muted">
          Choose the perfect model for your voice assistant's performance and cost requirements.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--vm-text-secondary)]" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 vm-input"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className={filterType === 'all' ? 'vm-button-primary' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            All Models
          </Button>
          <Button
            variant={filterType === 'recommended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('recommended')}
            className={filterType === 'recommended' ? 'vm-button-primary' : ''}
          >
            <Star className="h-4 w-4 mr-2" />
            Recommended
          </Button>
          <Button
            variant={filterType === 'fastest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('fastest')}
            className={filterType === 'fastest' ? 'vm-button-primary' : ''}
          >
            <Zap className="h-4 w-4 mr-2" />
            Fastest
          </Button>
          <Button
            variant={filterType === 'cheapest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('cheapest')}
            className={filterType === 'cheapest' ? 'vm-button-primary' : ''}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Most Economical
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all' ? 'vm-button-primary' : ''}
          >
            All Categories
          </Button>
          {Object.entries(MODEL_CATEGORIES).map(([key, category]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key as ModelCategory)}
              className={selectedCategory === key ? 'vm-button-primary' : ''}
              style={{
                borderColor: selectedCategory === key ? category.color : undefined,
                color: selectedCategory === key ? 'var(--vm-background)' : category.color,
                background: selectedCategory === key ? category.gradient : undefined
              }}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Models Grid by Category */}
      <div className="space-y-8">
        {Object.entries(groupedModels).map(([categoryKey, models]) => {
          if (models.length === 0) return null
          
          const categoryInfo = MODEL_CATEGORIES[categoryKey as ModelCategory]
          
          return (
            <div key={categoryKey}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: categoryInfo.gradient }}
                >
                  <span style={{ color: 'var(--vm-background)' }}>
                    {categoryInfo.icon}
                  </span>
                </div>
                <div>
                  <h3 className="vm-heading text-xl font-bold" style={{ color: categoryInfo.color }}>
                    {categoryInfo.name}
                  </h3>
                  <p className="text-sm vm-text-muted">{categoryInfo.description}</p>
                </div>
              </div>

              {/* Models Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {models.map(renderModelCard)}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Results */}
      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="vm-heading text-lg font-semibold mb-2">No models found</h3>
          <p className="vm-text-muted">
            Try adjusting your search terms or filters to find the perfect model.
          </p>
        </div>
      )}
    </div>
  )
}