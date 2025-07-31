'use client'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EvaluationRubric, EVALUATION_RUBRICS } from '@/lib/structured-data'

interface EvaluationSelectorProps {
  selectedRubric: EvaluationRubric | null
  onRubricChange: (rubric: EvaluationRubric | null) => void
  className?: string
}

// Enhanced evaluation options with detailed information
const enhancedRubrics = EVALUATION_RUBRICS.map(rubric => {
  const enhancements = {
    'NumericScale': {
      emoji: '📊',
      category: 'Quantitative',
      difficulty: 'Easy',
      setup: 'Quick',
      color: 'emerald',
      example: 'Rate 1-10 scale',
      useCase: 'Simple metrics'
    },
    'DescriptiveScale': {
      emoji: '📝',
      category: 'Qualitative', 
      difficulty: 'Medium',
      setup: 'Moderate',
      color: 'violet',
      example: 'Poor/Good/Excellent',
      useCase: 'Quality assessment'
    },
    'Checklist': {
      emoji: '✅',
      category: 'Binary',
      difficulty: 'Easy',
      setup: 'Quick',
      color: 'emerald',
      example: 'Requirements met',
      useCase: 'Compliance checks'
    },
    'Matrix': {
      emoji: '🔲',
      category: 'Complex',
      difficulty: 'Advanced',
      setup: 'Extended',
      color: 'orange',
      example: 'Multi-criteria grid',
      useCase: 'Detailed analysis'
    },
    'PercentageScale': {
      emoji: '📈',
      category: 'Quantitative',
      difficulty: 'Easy',
      setup: 'Quick',
      color: 'emerald',
      example: '0-100% scoring',
      useCase: 'Performance metrics'
    },
    'LikertScale': {
      emoji: '⭐',
      category: 'Survey',
      difficulty: 'Medium',
      setup: 'Moderate',
      color: 'violet',
      example: 'Strongly agree/disagree',
      useCase: 'Opinion research'
    },
    'AutomaticRubric': {
      emoji: '🤖',
      category: 'AI-Powered',
      difficulty: 'Easy',
      setup: 'Instant',
      color: 'orange',
      example: 'AI generates criteria',
      useCase: 'Automated scoring'
    },
    'PassFail': {
      emoji: '✓',
      category: 'Binary',
      difficulty: 'Easy',
      setup: 'Instant',
      color: 'emerald',
      example: 'Success/Failure',
      useCase: 'Basic validation'
    }
  }

  return {
    ...rubric,
    ...enhancements[rubric.value as keyof typeof enhancements]
  }
})

export function EvaluationSelector({ selectedRubric, onRubricChange, className }: EvaluationSelectorProps) {
  const selectedRubricInfo = selectedRubric 
    ? enhancedRubrics.find(r => r.value === selectedRubric)
    : null

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
    return colorMap[color as keyof typeof colorMap] || colorMap.emerald
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        <Label htmlFor="evaluation-select" className="text-sm font-semibold vm-text-primary">
          Call Evaluation Method
        </Label>
        <Select
          value={selectedRubric || 'none'}
          onValueChange={(value) => onRubricChange(value === 'none' ? null : value as EvaluationRubric)}
        >
          <SelectTrigger 
            id="evaluation-select"
            className="h-12 rounded-xl transition-all duration-200 focus:shadow-lg focus:shadow-orange-500/20"
            style={{
              background: 'var(--vm-background)',
              border: '1px solid var(--vm-border-subtle)',
              color: 'var(--vm-text-primary)'
            }}
          >
            <SelectValue placeholder="Select evaluation method">
              {selectedRubric ? (
                <div className="flex items-center gap-3">
                  <span className="text-lg">{selectedRubricInfo?.emoji}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedRubricInfo?.label}</span>
                    <Badge 
                      className="text-xs px-2"
                      style={{ 
                        background: getColorStyles(selectedRubricInfo?.color || 'emerald').bg,
                        color: getColorStyles(selectedRubricInfo?.color || 'emerald').text,
                        border: `1px solid ${getColorStyles(selectedRubricInfo?.color || 'emerald').border}`
                      }}
                    >
                      {selectedRubricInfo?.setup}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-lg">❌</span>
                  <span className="font-medium">No Evaluation</span>
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
            {/* No Evaluation Option */}
            <SelectItem 
              value="none" 
              className="rounded-lg p-4 cursor-pointer transition-all duration-200 border-b border-gray-800/30"
              style={{
                background: 'transparent',
                color: 'var(--vm-text-primary)'
              }}
            >
              <div className="flex items-start gap-4 w-full">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--vm-surface-elevated)' }}
                >
                  <span className="text-2xl">❌</span>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base vm-text-primary">No Evaluation</h3>
                    <Badge 
                      className="text-xs px-2 py-1"
                      style={{ 
                        background: 'var(--vm-surface-elevated)',
                        color: 'var(--vm-text-muted)',
                        border: '1px solid var(--vm-border-subtle)'
                      }}
                    >
                      Skip
                    </Badge>
                  </div>
                  <p className="text-sm vm-text-muted leading-relaxed">
                    Skip call evaluation - no scoring or analysis will be performed
                  </p>
                </div>
              </div>
            </SelectItem>

            {/* Enhanced Rubric Options */}
            {enhancedRubrics.map((rubric) => {
              const colorStyles = getColorStyles(rubric.color)
              return (
                <SelectItem 
                  key={rubric.value} 
                  value={rubric.value} 
                  className="rounded-lg p-4 cursor-pointer transition-all duration-200 border-b border-gray-800/30 last:border-b-0"
                  style={{
                    background: 'transparent',
                    color: 'var(--vm-text-primary)'
                  }}
                >
                  <div className="flex items-start gap-4 w-full">
                    {/* Rubric Icon */}
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--vm-gradient-brand)' }}
                    >
                      <span className="text-2xl">{rubric.emoji}</span>
                    </div>
                    
                    {/* Rubric Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base vm-text-primary">
                          {rubric.label}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{ 
                              background: colorStyles.bg,
                              color: colorStyles.text,
                              border: `1px solid ${colorStyles.border}`
                            }}
                          >
                            {rubric.setup}
                          </Badge>
                          <Badge 
                            className="text-xs px-2 py-1"
                            style={{ 
                              background: rubric.difficulty === 'Easy' ? 'var(--vm-emerald-pale)' : 
                                        rubric.difficulty === 'Medium' ? 'var(--vm-orange-pale)' : 'var(--vm-surface-elevated)',
                              color: rubric.difficulty === 'Easy' ? 'var(--vm-emerald)' : 
                                     rubric.difficulty === 'Medium' ? 'var(--vm-orange-primary)' : 'var(--vm-text-muted)',
                              border: `1px solid ${rubric.difficulty === 'Easy' ? 'var(--vm-emerald)' : 
                                       rubric.difficulty === 'Medium' ? 'var(--vm-orange-primary)' : 'var(--vm-border-subtle)'}`
                            }}
                          >
                            {rubric.difficulty}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Category & Example */}
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="text-xs px-2 py-1"
                          style={{
                            background: 'var(--vm-background)',
                            color: 'var(--vm-text-secondary)',
                            border: '1px solid var(--vm-border-subtle)'
                          }}
                        >
                          {rubric.category}
                        </Badge>
                        <span className="text-xs vm-text-muted">•</span>
                        <span className="text-xs vm-text-muted">{rubric.example}</span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm vm-text-muted leading-relaxed">
                        {rubric.description}
                      </p>
                      
                      {/* Use Case */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs vm-text-muted">Best for:</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--vm-orange-primary)' }}>
                          {rubric.useCase}
                        </span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        
        {selectedRubricInfo && (
          <div 
            className="p-4 rounded-xl border"
            style={{
              background: getColorStyles(selectedRubricInfo.color).bg,
              borderColor: getColorStyles(selectedRubricInfo.color).border,
              borderWidth: '1px'
            }}
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: getColorStyles(selectedRubricInfo.color).border }}
              >
                <span className="text-white text-sm">{selectedRubricInfo.emoji}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: getColorStyles(selectedRubricInfo.color).text }}>
                  {selectedRubricInfo.label} Selected
                </p>
                <p className="text-sm vm-text-secondary mt-1 leading-relaxed">
                  {selectedRubricInfo.description}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-xs vm-text-muted leading-relaxed">
          Choose how you want to evaluate and score the success of voice calls
        </p>
      </div>
    </div>
  )
}