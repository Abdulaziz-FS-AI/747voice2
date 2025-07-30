'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { PERSONALITY_TRAITS } from '@/lib/voices'
import { Badge } from '@/components/ui/badge'

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
  const [hoveredTrait, setHoveredTrait] = useState<string | null>(null)

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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--vm-primary)' }} />
          <h3 className="vm-heading text-lg font-bold">Personality & Tone</h3>
        </div>
        <p className="vm-text-muted text-sm mb-1">
          Select up to {maxSelections} personality traits that define your assistant's character.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {selectedTraits.length}/{maxSelections} selected
          </Badge>
          {selectedTraits.length === maxSelections && (
            <span className="text-xs text-[var(--vm-warning)]">
              Maximum traits selected
            </span>
          )}
        </div>
      </div>

      {/* Personality Traits Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONALITY_TRAITS.map((trait) => {
          const selected = isSelected(trait.id)
          const disabled = isDisabled(trait.id)
          const hovered = hoveredTrait === trait.id

          return (
            <div
              key={trait.id}
              className={`
                relative p-4 rounded-xl border transition-all duration-300 cursor-pointer
                ${selected 
                  ? 'vm-glow border-[var(--vm-primary)] bg-gradient-to-br from-[var(--vm-primary)]/10 to-transparent' 
                  : disabled
                    ? 'border-[var(--vm-border)] bg-[var(--vm-surface)]/50 cursor-not-allowed opacity-50'
                    : 'border-[var(--vm-border)] bg-[var(--vm-surface)] hover:border-[var(--vm-primary)]/50 hover:scale-[1.02]'
                }
              `}
              style={{
                background: selected 
                  ? `linear-gradient(135deg, ${trait.color}15 0%, transparent 100%)`
                  : hovered && !disabled
                    ? `linear-gradient(135deg, ${trait.color}08 0%, transparent 100%)`
                    : 'var(--vm-surface)'
              }}
              onClick={() => !disabled && toggleTrait(trait.id)}
              onMouseEnter={() => setHoveredTrait(trait.id)}
              onMouseLeave={() => setHoveredTrait(null)}
            >
              {/* Selection Indicator */}
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ 
                    background: selected 
                      ? trait.color 
                      : `${trait.color}20`,
                    color: selected 
                      ? 'white' 
                      : trait.color
                  }}
                >
                  {selected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    trait.label.charAt(0)
                  )}
                </div>
                
                {selected && (
                  <div 
                    className="h-2 w-2 rounded-full animate-pulse"
                    style={{ background: 'var(--vm-primary)' }}
                  />
                )}
              </div>

              {/* Trait Info */}
              <div>
                <h4 
                  className="font-semibold text-sm mb-1"
                  style={{ 
                    color: selected 
                      ? 'var(--vm-text-primary)' 
                      : trait.color 
                  }}
                >
                  {trait.label}
                </h4>
                <p className="text-xs text-[var(--vm-text-secondary)] leading-relaxed">
                  {trait.description}
                </p>
              </div>

              {/* Selection Border */}
              {selected && (
                <div 
                  className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                  style={{ borderColor: trait.color }}
                />
              )}

              {/* Hover Effect */}
              {hovered && !selected && !disabled && (
                <div 
                  className="absolute inset-0 rounded-xl border pointer-events-none"
                  style={{ borderColor: `${trait.color}50` }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Traits Summary */}
      {selectedTraits.length > 0 && (
        <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--vm-surface-elevated)' }}>
          <h4 className="font-semibold text-sm mb-3 text-[var(--vm-text-primary)]">
            Selected Personality Traits:
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTraits.map(traitId => {
              const trait = PERSONALITY_TRAITS.find(t => t.id === traitId)
              if (!trait) return null
              
              return (
                <Badge
                  key={traitId}
                  className="text-xs font-medium cursor-pointer hover:opacity-80"
                  style={{
                    background: trait.color,
                    color: 'white'
                  }}
                  onClick={() => toggleTrait(traitId)}
                >
                  {trait.label}
                  <span className="ml-1 opacity-70">×</span>
                </Badge>
              )
            })}
          </div>
          <p className="text-xs text-[var(--vm-text-secondary)] mt-2">
            Click on a trait to remove it from your selection.
          </p>
        </div>
      )}

      {/* Recommendations */}
      {selectedTraits.length === 0 && (
        <div className="mt-6 p-4 rounded-xl border border-[var(--vm-border)] bg-gradient-to-r from-[var(--vm-primary)]/5 to-transparent">
          <div className="flex items-start gap-3">
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--vm-primary)' }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1 text-[var(--vm-text-primary)]">
                Recommendation
              </h4>
              <p className="text-xs text-[var(--vm-text-secondary)] leading-relaxed">
                Start by selecting <strong>Professional</strong> and <strong>Friendly</strong> for a balanced business assistant, 
                or choose <strong>Energetic</strong> and <strong>Confident</strong> for a dynamic sales-focused personality.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}