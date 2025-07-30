'use client'

import { useState } from 'react'
import { BarChart3, CheckSquare, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EvaluationRubric, EVALUATION_RUBRICS } from '@/lib/structured-data'

interface EvaluationSelectorProps {
  selectedRubric: EvaluationRubric | null
  onRubricChange: (rubric: EvaluationRubric | null) => void
  className?: string
}

export function EvaluationSelector({ selectedRubric, onRubricChange, className }: EvaluationSelectorProps) {
  const [showDetails, setShowDetails] = useState(false)

  const selectedRubricInfo = selectedRubric 
    ? EVALUATION_RUBRICS.find(r => r.value === selectedRubric)
    : null

  const getRubricIcon = (rubric: EvaluationRubric) => {
    switch (rubric) {
      case 'NumericScale':
      case 'PercentageScale':
        return '📊'
      case 'DescriptiveScale':
      case 'LikertScale':
        return '📝'
      case 'Checklist':
        return '✅'
      case 'Matrix':
        return '🔲'
      case 'AutomaticRubric':
        return '🤖'
      case 'PassFail':
      default:
        return '✓'
    }
  }

  const getRubricColor = (rubric: EvaluationRubric) => {
    switch (rubric) {
      case 'NumericScale':
        return '#3B82F6'
      case 'DescriptiveScale':
        return '#10B981'
      case 'PercentageScale':
        return '#8B5CF6'
      case 'LikertScale':
        return '#F59E0B'
      case 'Checklist':
        return '#EF4444'
      case 'Matrix':
        return '#6366F1'
      case 'AutomaticRubric':
        return '#EC4899'
      case 'PassFail':
      default:
        return '#6B7280'
    }
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-5 w-5" style={{ color: 'var(--vm-primary)' }} />
          <h3 className="vm-heading text-lg font-bold">Call Evaluation</h3>
        </div>
        <p className="vm-text-muted text-sm">
          Choose how the AI will evaluate call success and performance. Results are stored in call.analysis.successEvaluation.
        </p>
      </div>

      {/* Rubric Selection */}
      <div className="space-y-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="evaluation-rubric">Evaluation Method</Label>
          <Select
            value={selectedRubric || 'none'}
            onValueChange={(value) => onRubricChange(value === 'none' ? null : value as EvaluationRubric)}
          >
            <SelectTrigger className="vm-input">
              <SelectValue placeholder="Select evaluation method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Evaluation</SelectItem>
              {EVALUATION_RUBRICS.map((rubric) => (
                <SelectItem key={rubric.value} value={rubric.value}>
                  <div className="flex items-center gap-2">
                    <span>{getRubricIcon(rubric.value)}</span>
                    <span>{rubric.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-[var(--vm-text-secondary)]">
            Select how the AI should evaluate call success and performance
          </p>
        </div>
      </div>

      {/* Selected Rubric Details */}
      {selectedRubricInfo && (
        <Card className="vm-card mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ background: `${getRubricColor(selectedRubric!)}20` }}
                >
                  {getRubricIcon(selectedRubric!)}
                </div>
                <div>
                  <CardTitle className="text-base text-[var(--vm-text-primary)]">
                    {selectedRubricInfo.label}
                  </CardTitle>
                  <CardDescription>
                    {selectedRubricInfo.description}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                className="text-xs"
                style={{
                  background: getRubricColor(selectedRubric!),
                  color: 'white'
                }}
              >
                Selected
              </Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Rubric Options Overview */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-[var(--vm-text-secondary)]" />
          <span className="text-sm font-medium text-[var(--vm-text-primary)]">
            Available Evaluation Methods:
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {EVALUATION_RUBRICS.map((rubric) => {
            const isSelected = selectedRubric === rubric.value
            
            return (
              <div
                key={rubric.value}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'vm-glow border-[var(--vm-primary)] bg-gradient-to-br from-[var(--vm-primary)]/10 to-transparent' 
                    : 'border-[var(--vm-border)] bg-[var(--vm-surface)] hover:border-[var(--vm-primary)]/50'
                  }
                `}
                style={{
                  background: isSelected 
                    ? `linear-gradient(135deg, ${getRubricColor(rubric.value)}15 0%, transparent 100%)`
                    : 'var(--vm-surface)'
                }}
                onClick={() => onRubricChange(isSelected ? null : rubric.value)}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ 
                      background: isSelected 
                        ? getRubricColor(rubric.value) 
                        : `${getRubricColor(rubric.value)}20`,
                      color: isSelected 
                        ? 'white' 
                        : getRubricColor(rubric.value)
                    }}
                  >
                    {getRubricIcon(rubric.value)}
                  </div>
                  <div className="min-w-0">
                    <h4 
                      className="font-semibold text-sm mb-1"
                      style={{ 
                        color: isSelected 
                          ? 'var(--vm-text-primary)' 
                          : getRubricColor(rubric.value) 
                      }}
                    >
                      {rubric.label}
                    </h4>
                    <p className="text-xs text-[var(--vm-text-secondary)] leading-relaxed">
                      {rubric.description}
                    </p>
                  </div>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="flex items-center justify-end mt-2">
                    <CheckSquare 
                      className="h-4 w-4" 
                      style={{ color: getRubricColor(rubric.value) }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* No Evaluation Note */}
      {!selectedRubric && (
        <div className="mt-6 p-4 rounded-xl border border-[var(--vm-border)] bg-gradient-to-r from-[var(--vm-text-secondary)]/5 to-transparent">
          <div className="flex items-start gap-3">
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--vm-text-secondary)' }}
            >
              <Info className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-1 text-[var(--vm-text-primary)]">
                No Evaluation Selected
              </h4>
              <p className="text-xs text-[var(--vm-text-secondary)] leading-relaxed">
                Calls will not be automatically evaluated for success metrics. You can still access transcripts and analysis data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}