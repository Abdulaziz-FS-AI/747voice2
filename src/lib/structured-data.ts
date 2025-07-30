// Structured Data Types for Voice Matrix

export interface StructuredQuestion {
  id: string
  question: string
  structuredName: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required: boolean
}

export type EvaluationRubric = 
  | 'NumericScale'
  | 'DescriptiveScale'
  | 'Checklist'
  | 'Matrix'
  | 'PercentageScale'
  | 'LikertScale'
  | 'AutomaticRubric'
  | 'PassFail'

export interface EvaluationRubricOption {
  value: EvaluationRubric
  label: string
  description: string
}

export const EVALUATION_RUBRICS: EvaluationRubricOption[] = [
  {
    value: 'PassFail',
    label: 'Pass/Fail',
    description: "Simple 'true' if call passed, 'false' if not"
  },
  {
    value: 'NumericScale',
    label: 'Numeric Scale (1-10)',
    description: 'A scale of 1 to 10 for quantitative evaluation'
  },
  {
    value: 'DescriptiveScale',
    label: 'Descriptive Scale',
    description: 'Scale of Excellent, Good, Fair, Poor'
  },
  {
    value: 'PercentageScale',
    label: 'Percentage Scale',
    description: 'A scale of 0% to 100%'
  },
  {
    value: 'LikertScale',
    label: 'Likert Scale',
    description: 'Scale of Strongly Agree, Agree, Neutral, Disagree, Strongly Disagree'
  },
  {
    value: 'Checklist',
    label: 'Checklist',
    description: 'A checklist of criteria and their status'
  },
  {
    value: 'Matrix',
    label: 'Matrix Evaluation',
    description: 'Grid that evaluates multiple criteria across different performance levels'
  },
  {
    value: 'AutomaticRubric',
    label: 'Automatic Rubric',
    description: 'Automatically break down evaluation into several criteria with scores'
  }
]

// Helper functions for VAPI integration
export function createStructuredDataSchema(questions: StructuredQuestion[]) {
  const properties: Record<string, any> = {}
  const required: string[] = []

  questions.forEach(question => {
    properties[question.structuredName] = {
      type: question.type,
      description: question.description
    }

    if (question.required) {
      required.push(question.structuredName)
    }
  })

  return {
    type: 'object',
    properties,
    required,
    description: 'Structured data extracted from the conversation'
  }
}

export function createAnalysisPlan(
  questions: StructuredQuestion[],
  evaluationRubric: EvaluationRubric | null,
  minMessagesThreshold: number = 2
) {
  const analysisPlan: any = {
    minMessagesThreshold,
    summaryPlan: {
      enabled: true,
      timeoutSeconds: 30
    }
  }

  // Add structured data plan if questions exist
  if (questions.length > 0) {
    analysisPlan.structuredDataPlan = {
      enabled: true,
      schema: createStructuredDataSchema(questions),
      timeoutSeconds: 30
    }
  }

  // Add evaluation plan if rubric is selected
  if (evaluationRubric) {
    analysisPlan.successEvaluationPlan = {
      rubric: evaluationRubric,
      enabled: true,
      timeoutSeconds: 30
    }
  }

  return analysisPlan
}