'use client'

import { Check, X } from 'lucide-react'
import { PERSONALITY_TRAITS } from '@/lib/voices'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PersonalitySelectorProps {
  selectedTraits: string[]
  onTraitsChange: (traits: string[]) => void
  maxSelections?: number
  className?: string
}

export function PersonalitySelector({ 
  selectedTraits, 
  onTraitsChange, 
  maxSelections = 5, 
  className 
}: PersonalitySelectorProps) {
  const toggleTrait = (traitId: string) => {
    if (selectedTraits.includes(traitId)) {
      // Remove trait
      onTraitsChange(selectedTraits.filter(id => id !== traitId))
    } else {
      // Add trait (if under limit)
      if (selectedTraits.length < maxSelections) {
        onTraitsChange([...selectedTraits, traitId])
      }
    }
  }

  const isSelected = (traitId: string) => selectedTraits.includes(traitId)
  const isDisabled = (traitId: string) => 
    !isSelected(traitId) && selectedTraits.length >= maxSelections

  return (
    <div className={className}>
      {/* Personality Traits - Compact Grid */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const selected = isSelected(trait.id)
            const disabled = isDisabled(trait.id)

            return (
              <Button
                key={trait.id}
                variant={selected ? "default" : "outline"}
                size="sm"
                className={`
                  h-8 px-3 text-xs transition-all duration-200
                  ${selected 
                    ? 'text-white border-0' 
                    : disabled 
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-gray-400'
                  }
                `}
                style={{
                  backgroundColor: selected ? trait.color : 'transparent',
                  borderColor: selected ? trait.color : undefined,
                  color: selected ? 'white' : undefined
                }}
                onClick={() => !disabled && toggleTrait(trait.id)}
                disabled={disabled}
              >
                {selected && <Check className="w-3 h-3 mr-1" />}
                {trait.label}
              </Button>
            )
          })}
        </div>

        {/* Selection Counter */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{selectedTraits.length}/{maxSelections} traits selected</span>
          {selectedTraits.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => onTraitsChange([])}
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Selected Traits with Remove Option */}
        {selectedTraits.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600">Selected:</div>
            <div className="flex flex-wrap gap-1">
              {selectedTraits.map(traitId => {
                const trait = PERSONALITY_TRAITS.find(t => t.id === traitId)
                if (!trait) return null
                
                return (
                  <Badge
                    key={traitId}
                    className="text-xs px-2 py-1 cursor-pointer hover:opacity-80 flex items-center gap-1"
                    style={{
                      backgroundColor: `${trait.color}20`,
                      color: trait.color,
                      border: `1px solid ${trait.color}40`
                    }}
                    onClick={() => toggleTrait(traitId)}
                  >
                    {trait.label}
                    <X className="w-3 h-3" />
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}