'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ModelSelectorProps {
  selectedModel?: string
  onModelSelect: (modelId: string) => void
  className?: string
}

// Simplified model options based on the screenshot
const modelOptions = [
  {
    id: 'gpt-4.1-nano-2025-04-14',
    label: 'Cheapest',
    description: 'GPT 4.1 Nano'
  },
  {
    id: 'gpt-4o-mini-cluster-2025-04-14',
    label: 'Fastest', 
    description: 'GPT 4o Mini Cluster'
  },
  {
    id: 'gpt-4.1-2025-04-14',
    label: '4.1',
    description: 'GPT 4.1'
  },
  {
    id: 'gpt-4o-cluster-2025-04-14',
    label: '4o',
    description: 'GPT 4o Cluster'
  }
]

export function ModelSelector({ selectedModel, onModelSelect, className }: ModelSelectorProps) {
  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="model-select">AI Model *</Label>
        <Select value={selectedModel} onValueChange={onModelSelect}>
          <SelectTrigger className="bg-gray-900 border-gray-700 text-white placeholder-gray-400 text-sm focus:border-orange-400 focus:ring-orange-400">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700">
            {modelOptions.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-white hover:bg-gray-800 focus:bg-gray-800">
                <div className="py-2">
                  <div className="font-semibold text-sm text-white leading-tight">{model.label}</div>
                  <div className="text-xs text-gray-400 leading-relaxed mt-1">{model.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--vm-text-secondary)]">
          Choose the AI model that best fits your needs
        </p>
      </div>
    </div>
  )
}