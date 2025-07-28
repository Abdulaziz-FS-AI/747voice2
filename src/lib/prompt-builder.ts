/**
 * Prompt Builder - Merges template with user customization
 * Professional implementation with type safety and error handling
 */

import { z } from 'zod'

// Types
export interface PromptTemplate {
  id: string
  industry: string
  name: string
  base_prompt: string
  dynamic_slots: string[]
  required_fields: string[]
  first_message_template?: string
}

export interface AssistantCustomization {
  agentName: string
  companyName: string
  tone: 'professional' | 'friendly' | 'casual'
  customInstructions?: string
  questions: QuestionData[]
}

export interface QuestionData {
  id?: string
  questionText: string
  answerDescription: string
  structuredFieldName: string
  fieldType: 'string' | 'number' | 'boolean'
  isRequired: boolean
  displayOrder: number
}

// Validation schemas
export const assistantCustomizationSchema = z.object({
  agentName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(255),
  tone: z.enum(['professional', 'friendly', 'casual']),
  customInstructions: z.string().optional(),
  questions: z.array(z.object({
    questionText: z.string().min(1),
    answerDescription: z.string().min(1),
    structuredFieldName: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
    fieldType: z.enum(['string', 'number', 'boolean']),
    isRequired: z.boolean(),
    displayOrder: z.number()
  }))
})

/**
 * Main Prompt Builder Class
 */
export class PromptBuilder {
  private static readonly TONE_EXPANSIONS = {
    professional: 'professional, knowledgeable, and courteous',
    friendly: 'warm, approachable, and enthusiastic',
    casual: 'relaxed, conversational, and easy-going'
  }

  /**
   * Build complete system prompt from template and customization
   */
  static buildSystemPrompt(
    template: PromptTemplate,
    customization: AssistantCustomization
  ): string {
    // Validate inputs
    const validated = assistantCustomizationSchema.parse(customization)
    
    // Validate required fields
    this.validateRequiredFields(template, validated)
    
    // Build replacements map
    const replacements = this.buildReplacements(validated)
    
    // Apply replacements to template
    let finalPrompt = template.base_prompt
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\{${placeholder}\\}`, 'g')
      finalPrompt = finalPrompt.replace(regex, value)
    })
    
    // Clean up and validate final prompt
    finalPrompt = this.cleanPrompt(finalPrompt)
    this.validateFinalPrompt(finalPrompt, template.dynamic_slots)
    
    return finalPrompt
  }

  /**
   * Build first message from template
   */
  static buildFirstMessage(
    template: PromptTemplate,
    customization: AssistantCustomization
  ): string {
    if (!template.first_message_template) {
      return `Hello! Thank you for calling ${customization.companyName}. This is ${customization.agentName}, your AI assistant. How can I help you today?`
    }
    
    let firstMessage = template.first_message_template
    
    // Simple replacements for first message
    const replacements = {
      AGENT_NAME: customization.agentName,
      COMPANY_NAME: customization.companyName
    }
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(`\\{${placeholder}\\}`, 'g')
      firstMessage = firstMessage.replace(regex, value)
    })
    
    return firstMessage.trim()
  }

  /**
   * Build replacements map
   */
  private static buildReplacements(customization: AssistantCustomization): Record<string, string> {
    return {
      AGENT_NAME: customization.agentName,
      COMPANY_NAME: customization.companyName,
      TONE: this.TONE_EXPANSIONS[customization.tone],
      CUSTOM_INSTRUCTIONS: this.buildCustomInstructions(customization.customInstructions),
      QUESTION_COLLECTION_INSTRUCTIONS: this.buildQuestionInstructions(customization.questions)
    }
  }

  /**
   * Build custom instructions section
   */
  private static buildCustomInstructions(custom?: string): string {
    if (!custom || custom.trim() === '') {
      return 'Follow standard real estate best practices and be helpful to all callers.'
    }
    
    return `
ADDITIONAL INSTRUCTIONS FROM USER:
${custom.trim()}

Remember to follow these custom guidelines while maintaining your professional demeanor.
    `.trim()
  }

  /**
   * Build question collection instructions
   */
  private static buildQuestionInstructions(questions: QuestionData[]): string {
    if (!questions || questions.length === 0) {
      return 'Collect basic contact information naturally during the conversation when appropriate.'
    }
    
    // Sort questions by display order
    const sortedQuestions = [...questions].sort((a, b) => a.displayOrder - b.displayOrder)
    
    // Build required and optional lists
    const requiredQuestions = sortedQuestions.filter(q => q.isRequired)
    const optionalQuestions = sortedQuestions.filter(q => !q.isRequired)
    
    let instructions = `
INFORMATION TO COLLECT:
You must gather the following information naturally during your conversation.

REQUIRED INFORMATION (Must collect before ending call):
${requiredQuestions.map(q => this.formatQuestion(q)).join('\n')}
`
    
    if (optionalQuestions.length > 0) {
      instructions += `
\nOPTIONAL INFORMATION (Collect if naturally fits the conversation):
${optionalQuestions.map(q => this.formatQuestion(q)).join('\n')}
`
    }
    
    instructions += `
\nCOLLECTION GUIDELINES:
- Ask questions conversationally, not like filling out a form
- Space questions throughout the natural flow of conversation
- Use the collectLeadData function whenever you gather any information
- Don't ask all questions at once - let the conversation guide you
- For required fields, gently circle back if not collected before ending
- Make data collection feel helpful, not intrusive
- If someone seems reluctant to share, respect their privacy
- Always explain why you're asking if it helps build trust

IMPORTANT: Call the collectLeadData function with collected data like this:
collectLeadData({
  ${sortedQuestions.map(q => `${q.structuredFieldName}: "value"`).join(',\n  ')}
})
`
    
    return instructions.trim()
  }

  /**
   * Format individual question for prompt
   */
  private static formatQuestion(question: QuestionData): string {
    return `
- ASK: "${question.questionText}"
  PURPOSE: ${question.answerDescription}
  SAVE AS: ${question.structuredFieldName} (${question.fieldType})${question.isRequired ? ' [REQUIRED]' : ''}`.trim()
  }

  /**
   * Validate required fields are present
   */
  private static validateRequiredFields(
    template: PromptTemplate,
    customization: AssistantCustomization
  ): void {
    const providedFields = {
      AGENT_NAME: customization.agentName,
      COMPANY_NAME: customization.companyName
    }
    
    const missingFields = template.required_fields.filter(
      field => !providedFields[field] || providedFields[field].trim() === ''
    )
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }
  }

  /**
   * Clean and normalize prompt
   */
  private static cleanPrompt(prompt: string): string {
    return prompt
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
  }

  /**
   * Validate final prompt has no unreplaced placeholders
   */
  private static validateFinalPrompt(prompt: string, slots: string[]): void {
    const unreplacedPlaceholders = slots.filter(slot => 
      prompt.includes(`{${slot}}`)
    )
    
    if (unreplacedPlaceholders.length > 0) {
      console.warn(`Unreplaced placeholders found: ${unreplacedPlaceholders.join(', ')}`)
    }
  }
}

/**
 * Build Vapi function schema from questions
 */
export function buildVapiFunctions(questions: QuestionData[]): any[] {
  const properties: Record<string, any> = {}
  const required: string[] = []
  
  questions.forEach(question => {
    // Map field types to JSON Schema types
    const schemaType = question.fieldType === 'boolean' ? 'boolean' : 
                      question.fieldType === 'number' ? 'number' : 'string'
    
    properties[question.structuredFieldName] = {
      type: schemaType,
      description: question.answerDescription
    }
    
    if (question.isRequired) {
      required.push(question.structuredFieldName)
    }
  })
  
  return [{
    name: 'collectLeadData',
    description: 'Call this function to save any lead information collected during the conversation. Call it multiple times as you gather information.',
    parameters: {
      type: 'object',
      properties: properties,
      required: required
    }
  }]
}