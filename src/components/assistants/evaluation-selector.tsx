'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EvaluationRubric, EVALUATION_RUBRICS } from '@/lib/structured-data'

interface EvaluationSelectorProps {
  selectedRubric: EvaluationRubric | null
  onRubricChange: (rubric: EvaluationRubric | null) => void
  className?: string
}

export function EvaluationSelector({ selectedRubric, onRubricChange, className }: EvaluationSelectorProps) {
  const selectedRubricInfo = selectedRubric 
    ? EVALUATION_RUBRICS.find(r => r.value === selectedRubric)
    : null

  const getRubricIcon = (rubric: EvaluationRubric) => {
    switch (rubric) {
      case 'NumericScale': return '📊'
      case 'DescriptiveScale': return '📝'
      case 'Checklist': return '✅'
      case 'Matrix': return '🔲'
      case 'PercentageScale': return '📈'
      case 'LikertScale': return '⭐'
      case 'AutomaticRubric': return '🤖'
      case 'PassFail': return '✓'
      default: return '📋'
    }
  }

  return (
    <div className={className}>
      <Select
        value={selectedRubric || 'none'}
        onValueChange={(value) => onRubricChange(value === 'none' ? null : value as EvaluationRubric)}
      >
        <SelectTrigger className="text-sm">
          <SelectValue placeholder="Select evaluation method">
            {selectedRubric ? (
              <div className="flex items-center gap-2">
                <span>{getRubricIcon(selectedRubric)}</span>
                <span>{selectedRubricInfo?.label}</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {selectedRubricInfo?.value}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>❌</span>
                <span>No Evaluation</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          <SelectItem value="none" className="text-white hover:bg-gray-800 focus:bg-gray-800">
            <div className="flex items-center gap-3 py-1">
              <span className="text-base flex-shrink-0">❌</span>
              <span className="font-medium text-sm">No Evaluation</span>
            </div>
          </SelectItem>
          {EVALUATION_RUBRICS.map((rubric) => (
            <SelectItem key={rubric.value} value={rubric.value} className="text-white hover:bg-gray-800 focus:bg-gray-800">
              <div className="flex items-start gap-3 py-2">
                <span className="text-base flex-shrink-0 mt-0.5">{getRubricIcon(rubric.value)}</span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-sm text-white leading-tight">{rubric.label}</span>
                  <span className="text-xs text-gray-400 leading-relaxed line-clamp-2">{rubric.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedRubricInfo && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedRubricInfo.description}
        </p>
      )}
    </div>
  )
}