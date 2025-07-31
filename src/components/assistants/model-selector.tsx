'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ModelSelectorProps {
  selectedModel?: string
  onModelSelect: (modelId: string) => void
  className?: string
}

// Enhanced model options with Voice Matrix styling
const modelOptions = [
  {
    id: 'gpt-4.1-nano-2025-04-14',
    name: 'GPT 4.1 Nano',
    label: 'Cheapest',
    emoji: '💰',
    description: 'Best value for simple conversations and basic interactions',
    performance: 'Basic',
    cost: 'Lowest',
    capabilities: ['Text Generation', 'Simple Q&A'],
    recommended: 'Budget-conscious projects',
    speed: 'Fast',
    complexity: 'Low'
  },
  {
    id: 'gpt-4o-mini-cluster-2025-04-14',
    name: 'GPT 4o Mini Cluster',
    label: 'Fastest', 
    emoji: '⚡',
    description: 'Optimized for speed with excellent response times',
    performance: 'High Speed',
    cost: 'Low',
    capabilities: ['Fast Responses', 'Real-time Chat', 'Quick Processing'],
    recommended: 'High-volume applications',
    speed: 'Fastest',
    complexity: 'Medium'
  },
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT 4.1',
    label: 'Balanced',
    emoji: '🎯',
    description: 'Perfect balance of performance, cost, and capabilities',
    performance: 'Excellent',
    cost: 'Medium',
    capabilities: ['Advanced Reasoning', 'Complex Tasks', 'Nuanced Responses'],
    recommended: 'Most voice agents',
    speed: 'Fast',
    complexity: 'High'
  },
  {
    id: 'gpt-4o-cluster-2025-04-14',
    name: 'GPT 4o Cluster',
    label: 'Most Capable',
    emoji: '🚀',
    description: 'Highest capability model for complex reasoning and tasks',
    performance: 'Maximum',
    cost: 'Higher',
    capabilities: ['Advanced AI', 'Complex Reasoning', 'Creative Tasks', 'Professional Use'],
    recommended: 'Enterprise applications',
    speed: 'Very Fast',
    complexity: 'Maximum'
  }
]

export function ModelSelector({ selectedModel, onModelSelect, className }: ModelSelectorProps) {
  const selectedModelData = selectedModel ? modelOptions.find(m => m.id === selectedModel) : null

  return (
    <div className={className}>
      <div className="space-y-3">
        <Label htmlFor="model-select" className="text-sm font-semibold vm-text-primary">
          AI Model *
        </Label>
        <Select value={selectedModel} onValueChange={onModelSelect}>
          <SelectTrigger 
            id="model-select"
            className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
            style={{
              background: 'var(--vm-background)',
              border: '1px solid var(--vm-border-subtle)',
              color: 'var(--vm-text-primary)'
            }}
          >
            <SelectValue placeholder="Select an AI model">
              {selectedModelData && (
                <div className="flex items-center gap-3">
                  <span className="text-lg">{selectedModelData.emoji}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedModelData.label}</span>
                    <Badge 
                      className="text-xs px-2"
                      style={{ 
                        background: 'var(--vm-orange-pale)', 
                        color: 'var(--vm-orange-primary)',
                        border: '1px solid var(--vm-orange-primary)'
                      }}
                    >
                      {selectedModelData.speed}
                    </Badge>
                  </div>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent 
            className="rounded-xl border-0 shadow-2xl"
            style={{
              background: 'var(--vm-surface)',
              border: '1px solid var(--vm-border-subtle)'
            }}
          >
            {modelOptions.map((model) => (
              <SelectItem 
                key={model.id} 
                value={model.id} 
                className="rounded-lg p-4 cursor-pointer transition-all duration-200 border-b border-gray-800/30 last:border-b-0"
                style={{
                  background: 'transparent',
                  color: 'var(--vm-text-primary)'
                }}
              >
                <div className="flex items-start gap-4 w-full">
                  {/* Model Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--vm-gradient-brand)' }}
                  >
                    <span className="text-2xl">{model.emoji}</span>
                  </div>
                  
                  {/* Model Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base vm-text-primary">
                        {model.label}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{ 
                            background: 'var(--vm-emerald-pale)', 
                            color: 'var(--vm-emerald)',
                            border: '1px solid var(--vm-emerald)'
                          }}
                        >
                          {model.speed}
                        </Badge>
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{ 
                            background: model.cost === 'Lowest' ? 'var(--vm-emerald-pale)' : 
                                      model.cost === 'Low' ? 'var(--vm-orange-pale)' :
                                      model.cost === 'Medium' ? 'var(--vm-violet-pale)' : 'var(--vm-surface-elevated)', 
                            color: model.cost === 'Lowest' ? 'var(--vm-emerald)' : 
                                   model.cost === 'Low' ? 'var(--vm-orange-primary)' :
                                   model.cost === 'Medium' ? 'var(--vm-violet)' : 'var(--vm-text-muted)',
                            border: `1px solid ${model.cost === 'Lowest' ? 'var(--vm-emerald)' : 
                                     model.cost === 'Low' ? 'var(--vm-orange-primary)' :
                                     model.cost === 'Medium' ? 'var(--vm-violet)' : 'var(--vm-border-subtle)'}`
                          }}
                        >
                          {model.cost} Cost
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Model Name */}
                    <p className="text-sm font-medium vm-text-secondary">
                      {model.name}
                    </p>
                    
                    {/* Description */}
                    <p className="text-sm vm-text-muted leading-relaxed">
                      {model.description}
                    </p>
                    
                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {model.capabilities.slice(0, 3).map((capability, index) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 rounded-md"
                          style={{
                            background: 'var(--vm-background)',
                            color: 'var(--vm-text-muted)',
                            border: '1px solid var(--vm-border-subtle)'
                          }}
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                    
                    {/* Recommended Use */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs vm-text-muted">Best for:</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--vm-orange-primary)' }}>
                        {model.recommended}
                      </span>
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs vm-text-muted leading-relaxed">
          Choose the AI model that best matches your voice agent's complexity and performance needs
        </p>
      </div>
    </div>
  )
}