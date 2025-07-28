/**
 * Call Analyzer - AI-powered analysis of call data for lead scoring and insights
 * Uses OpenAI GPT-4 to analyze conversations and extract business intelligence
 */

import { createServiceRoleClient } from '@/lib/supabase'
import type { CallAnalysisResult } from '@/types/vapi-webhooks'
import type { ExtractedResponse } from './lead-extractor'

export interface CallAnalysisInput {
  callId: string
  assistantId: string
  userId: string
  transcript: string
  responses: ExtractedResponse[]
  callDuration: number
  callCost: number
}

export interface ScoringFactors {
  contactInfo: { weight: number; score: number; reason: string }
  intent: { weight: number; score: number; reason: string }
  engagement: { weight: number; score: number; reason: string }
  qualification: { weight: number; score: number; reason: string }
  urgency: { weight: number; score: number; reason: string }
}

export class CallAnalyzer {
  private supabase = createServiceRoleClient()
  private openaiApiKey = process.env.OPENAI_API_KEY

  /**
   * Perform comprehensive AI analysis of a completed call
   */
  async analyzeCall(input: CallAnalysisInput): Promise<CallAnalysisResult> {
    console.log(`🧠 Analyzing call ${input.callId}`)
    
    try {
      // Run multiple analysis components in parallel
      const [leadScore, sentiment, intent, topics, engagement] = await Promise.all([
        this.calculateLeadScore(input),
        this.analyzeSentiment(input.transcript),
        this.analyzeIntent(input.transcript, input.responses),
        this.extractTopics(input.transcript),
        this.analyzeEngagement(input)
      ])

      // Determine qualification status
      const qualificationStatus = this.determineQualificationStatus(leadScore, sentiment, intent)
      const leadQuality = this.determineLedQuality(leadScore, sentiment.score, intent.confidence)

      // Generate AI summary
      const aiSummary = await this.generateAISummary(input)
      const nextSteps = this.generateNextSteps(qualificationStatus, leadScore, topics)

      const result: CallAnalysisResult = {
        leadScore,
        qualificationStatus,
        leadQuality,
        sentiment,
        intent,
        topics,
        engagement,
        summary: aiSummary,
        nextSteps,
        confidence: this.calculateOverallConfidence([sentiment, intent, engagement])
      }

      console.log(`✅ Analysis complete: Score ${leadScore}, Status: ${qualificationStatus}`)
      
      return result
    } catch (error) {
      console.error('Call analysis failed:', error)
      throw error
    }
  }

  /**
   * Calculate lead score based on multiple factors
   */
  private async calculateLeadScore(input: CallAnalysisInput): Promise<number> {
    const factors: ScoringFactors = {
      contactInfo: this.scoreContactInfo(input.responses),
      intent: this.scoreIntent(input.transcript),
      engagement: this.scoreEngagement(input),
      qualification: this.scoreQualification(input.responses),
      urgency: this.scoreUrgency(input.transcript)
    }

    // Calculate weighted score
    let totalScore = 0
    let totalWeight = 0

    for (const [key, factor] of Object.entries(factors)) {
      totalScore += factor.score * factor.weight
      totalWeight += factor.weight
      console.log(`  ${key}: ${factor.score}/100 (weight: ${factor.weight}) - ${factor.reason}`)
    }

    const finalScore = Math.round(totalScore / totalWeight)
    console.log(`  Final Score: ${finalScore}/100`)
    
    return Math.min(100, Math.max(0, finalScore))
  }

  /**
   * Score contact information completeness
   */
  private scoreContactInfo(responses: ExtractedResponse[]): ScoringFactors['contactInfo'] {
    const contactFields = ['full_name', 'first_name', 'last_name', 'phone_number', 'email']
    const providedFields = responses
      .filter(r => contactFields.includes(r.fieldName) && r.answerValue?.trim())
      .map(r => r.fieldName)

    const hasName = providedFields.some(f => ['full_name', 'first_name', 'last_name'].includes(f))
    const hasPhone = providedFields.includes('phone_number')
    const hasEmail = providedFields.includes('email')

    let score = 0
    let reason = 'Contact info: '

    if (hasName) { score += 40; reason += 'name ✓ ' }
    if (hasPhone) { score += 35; reason += 'phone ✓ ' }
    if (hasEmail) { score += 25; reason += 'email ✓ ' }

    return {
      weight: 25,
      score,
      reason: reason || 'No contact information provided'
    }
  }

  /**
   * Score intent strength based on keywords and context
   */
  private scoreIntent(transcript: string): ScoringFactors['intent'] {
    const text = transcript.toLowerCase()
    
    // High-intent keywords
    const buyingKeywords = ['buy', 'purchase', 'looking for', 'need', 'want to buy', 'ready to buy']
    const sellingKeywords = ['sell', 'selling', 'list', 'market', 'want to sell']
    const urgencyKeywords = ['immediately', 'asap', 'urgent', 'right away', 'this week', 'this month']
    
    let score = 20 // Base score
    let reason = 'Intent: '
    
    const buyingMatches = buyingKeywords.filter(kw => text.includes(kw))
    const sellingMatches = sellingKeywords.filter(kw => text.includes(kw))
    const urgencyMatches = urgencyKeywords.filter(kw => text.includes(kw))
    
    if (buyingMatches.length > 0) { score += 30; reason += `buying signals (${buyingMatches.length}) ` }
    if (sellingMatches.length > 0) { score += 30; reason += `selling signals (${sellingMatches.length}) ` }
    if (urgencyMatches.length > 0) { score += 20; reason += `urgency signals (${urgencyMatches.length}) ` }
    
    // Negative signals
    const negativeKeywords = ['just curious', 'just looking', 'maybe', 'not sure', 'thinking about']
    const negativeMatches = negativeKeywords.filter(kw => text.includes(kw))
    if (negativeMatches.length > 0) { score -= 20; reason += `negative signals (${negativeMatches.length}) ` }
    
    return {
      weight: 30,
      score: Math.max(0, score),
      reason
    }
  }

  /**
   * Score engagement based on call metrics
   */
  private scoreEngagement(input: CallAnalysisInput): ScoringFactors['engagement'] {
    let score = 0
    let reason = 'Engagement: '
    
    // Duration scoring
    const duration = input.callDuration
    if (duration >= 300) { score += 30; reason += 'long call (5+ min) ' }
    else if (duration >= 120) { score += 20; reason += 'medium call (2-5 min) ' }
    else if (duration >= 60) { score += 10; reason += 'short call (1-2 min) ' }
    else { reason += 'very short call (<1 min) ' }
    
    // Response completeness
    const responseRate = input.responses.length
    if (responseRate >= 5) { score += 25; reason += 'many responses (5+) ' }
    else if (responseRate >= 3) { score += 15; reason += 'some responses (3-4) ' }
    else if (responseRate >= 1) { score += 10; reason += 'few responses (1-2) ' }
    
    // Quality of responses (non-empty, meaningful)
    const qualityResponses = input.responses.filter(r => 
      r.answerValue.length > 2 && !['yes', 'no', 'ok', 'sure'].includes(r.answerValue.toLowerCase())
    ).length
    
    if (qualityResponses >= 3) { score += 20; reason += 'detailed answers ' }
    else if (qualityResponses >= 1) { score += 10; reason += 'some detail ' }
    
    return {
      weight: 20,
      score,
      reason
    }
  }

  /**
   * Score qualification based on specific criteria
   */
  private scoreQualification(responses: ExtractedResponse[]): ScoringFactors['qualification'] {
    let score = 30 // Base score for engagement
    let reason = 'Qualification: '
    
    const fields = responses.reduce((acc, r) => {
      acc[r.fieldName] = r.answerValue
      return acc
    }, {} as Record<string, string>)
    
    // Budget qualification
    if (fields.budget || fields.budget_min || fields.budget_max) {
      score += 25
      reason += 'budget provided '
    }
    
    // Timeline qualification
    if (fields.timeline) {
      const timeline = fields.timeline.toLowerCase()
      if (['immediately', 'asap', 'this month'].some(t => timeline.includes(t))) {
        score += 20
        reason += 'urgent timeline '
      } else if (['few months', 'next year'].some(t => timeline.includes(t))) {
        score += 10
        reason += 'future timeline '
      }
    }
    
    // Property type specificity
    if (fields.property_type) {
      score += 15
      reason += 'specific property type '
    }
    
    // Location specificity
    if (fields.location || fields.preferred_location) {
      score += 10
      reason += 'specific location '
    }
    
    return {
      weight: 15,
      score,
      reason
    }
  }

  /**
   * Score urgency based on language patterns
   */
  private scoreUrgency(transcript: string): ScoringFactors['urgency'] {
    const text = transcript.toLowerCase()
    let score = 20 // Base score
    let reason = 'Urgency: '
    
    const highUrgency = ['immediately', 'asap', 'urgent', 'right away', 'this week']
    const mediumUrgency = ['soon', 'this month', 'next month', 'few weeks']
    const lowUrgency = ['eventually', 'someday', 'no rush', 'just exploring']
    
    const highMatches = highUrgency.filter(kw => text.includes(kw))
    const mediumMatches = mediumUrgency.filter(kw => text.includes(kw))
    const lowMatches = lowUrgency.filter(kw => text.includes(kw))
    
    if (highMatches.length > 0) { score += 50; reason += `high urgency (${highMatches.join(', ')}) ` }
    else if (mediumMatches.length > 0) { score += 25; reason += `medium urgency (${mediumMatches.join(', ')}) ` }
    else if (lowMatches.length > 0) { score -= 10; reason += `low urgency (${lowMatches.join(', ')}) ` }
    
    return {
      weight: 10,
      score: Math.max(0, score),
      reason
    }
  }

  /**
   * Analyze sentiment using simple keyword analysis
   * In production, you'd use OpenAI or other AI service
   */
  private async analyzeSentiment(transcript: string): Promise<CallAnalysisResult['sentiment']> {
    const text = transcript.toLowerCase()
    
    const positiveKeywords = ['great', 'excellent', 'perfect', 'love', 'amazing', 'wonderful', 'fantastic']
    const negativeKeywords = ['terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry']
    const neutralKeywords = ['okay', 'fine', 'alright', 'maybe', 'possibly']
    
    const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length
    const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length
    const neutralCount = neutralKeywords.filter(kw => text.includes(kw)).length
    
    let score = 0
    let label: 'positive' | 'negative' | 'neutral' = 'neutral'
    let emotionalTone = 'neutral'
    
    if (positiveCount > negativeCount) {
      score = Math.min(1, 0.3 + (positiveCount * 0.2))
      label = 'positive'
      emotionalTone = positiveCount > 2 ? 'enthusiastic' : 'interested'
    } else if (negativeCount > positiveCount) {
      score = Math.max(-1, -0.3 - (negativeCount * 0.2))
      label = 'negative'
      emotionalTone = negativeCount > 2 ? 'frustrated' : 'skeptical'
    } else {
      score = 0
      label = 'neutral'
      emotionalTone = neutralCount > 0 ? 'cautious' : 'neutral'
    }
    
    return { score, label, emotionalTone }
  }

  /**
   * Analyze caller intent and classification
   */
  private async analyzeIntent(
    transcript: string, 
    responses: ExtractedResponse[]
  ): Promise<CallAnalysisResult['intent']> {
    const text = transcript.toLowerCase()
    
    const intents = {
      buying: ['buy', 'purchase', 'looking for', 'need a', 'want to buy'],
      selling: ['sell', 'selling', 'list my', 'market my'],
      investing: ['invest', 'investment', 'rental', 'flip'],
      renting: ['rent', 'rental', 'lease', 'tenant'],
      information: ['information', 'learn', 'curious', 'wondering']
    }
    
    const scores: Record<string, number> = {}
    
    for (const [intent, keywords] of Object.entries(intents)) {
      scores[intent] = keywords.filter(kw => text.includes(kw)).length
    }
    
    // Find primary intent
    const primary = Object.entries(scores).reduce((max, [intent, score]) => 
      score > max.score ? { intent, score } : max, 
      { intent: 'information', score: 0 }
    )
    
    // Find secondary intents
    const secondary = Object.entries(scores)
      .filter(([intent, score]) => intent !== primary.intent && score > 0)
      .map(([intent]) => intent)
    
    const confidence = Math.min(1, primary.score * 0.3)
    
    return {
      primary: primary.intent,
      secondary,
      confidence
    }
  }

  /**
   * Extract key topics and themes from conversation
   */
  private async extractTopics(transcript: string): Promise<CallAnalysisResult['topics']> {
    const text = transcript.toLowerCase()
    
    // Define topic categories
    const topicCategories = {
      keyTopics: {
        'price': ['price', 'cost', 'expensive', 'cheap', 'afford', 'budget'],
        'location': ['location', 'area', 'neighborhood', 'close to', 'near'],
        'size': ['size', 'square feet', 'bedrooms', 'bathrooms', 'rooms'],
        'condition': ['condition', 'renovated', 'new', 'old', 'updated'],
        'timeline': ['when', 'timeline', 'timeframe', 'schedule']
      },
      objections: {
        'price_objection': ['too expensive', 'over budget', 'cant afford'],
        'timing_objection': ['not ready', 'too soon', 'need time'],
        'quality_objection': ['not what im looking for', 'not suitable'],
        'process_objection': ['complicated', 'too much paperwork', 'dont understand']
      },
      painPoints: {
        'financial': ['budget', 'loan', 'mortgage', 'down payment', 'credit'],
        'timing': ['urgent', 'deadline', 'need soon', 'running out of time'],
        'family': ['schools', 'family', 'children', 'growing family'],
        'work': ['commute', 'job', 'work', 'office']
      },
      interests: {
        'investment': ['investment', 'rental income', 'appreciation', 'roi'],
        'lifestyle': ['lifestyle', 'dream home', 'perfect', 'love'],
        'practical': ['practical', 'functional', 'needs', 'requirements']
      }
    }
    
    const extractedTopics: CallAnalysisResult['topics'] = {
      keyTopics: [],
      objections: [],
      painPoints: [],
      interests: []
    }
    
    // Extract topics for each category
    for (const [category, topics] of Object.entries(topicCategories)) {
      for (const [topic, keywords] of Object.entries(topics)) {
        if (keywords.some(kw => text.includes(kw))) {
          extractedTopics[category as keyof typeof extractedTopics].push(topic)
        }
      }
    }
    
    return extractedTopics
  }

  /**
   * Analyze engagement metrics
   */
  private analyzeEngagement(input: CallAnalysisInput): CallAnalysisResult['engagement'] {
    const transcript = input.transcript
    const responses = input.responses
    
    // Calculate talk time percentage (simplified)
    const userWordCount = transcript.split(' ').length / 2 // Rough estimate
    const agentTalkTime = 50 // Default assumption
    
    // Calculate engagement score
    let engagementScore = 50 // Base score
    
    // Adjust based on responses
    engagementScore += Math.min(30, responses.length * 5)
    
    // Adjust based on call duration
    const duration = input.callDuration
    if (duration > 300) engagementScore += 20
    else if (duration > 120) engagementScore += 10
    
    return {
      score: Math.min(100, engagementScore),
      talkTimePercentage: agentTalkTime,
      questionsAnswered: responses.length,
      totalQuestions: responses.length // Simplified
    }
  }

  /**
   * Determine qualification status based on analysis
   */
  private determineQualificationStatus(
    leadScore: number,
    sentiment: CallAnalysisResult['sentiment'],
    intent: CallAnalysisResult['intent']
  ): CallAnalysisResult['qualificationStatus'] {
    if (leadScore >= 80 && sentiment.score > 0 && intent.confidence > 0.7) {
      return 'hot_lead'
    }
    if (leadScore >= 60 && sentiment.score >= 0) {
      return 'qualified'
    }
    if (leadScore >= 40) {
      return 'needs_followup'
    }
    return 'unqualified'
  }

  /**
   * Determine lead quality rating
   */
  private determineLedQuality(
    leadScore: number,
    sentimentScore: number,
    intentConfidence: number
  ): CallAnalysisResult['leadQuality'] {
    const overallScore = (leadScore + (sentimentScore * 50) + (intentConfidence * 100)) / 3
    
    if (overallScore >= 75) return 'hot'
    if (overallScore >= 50) return 'warm'
    if (overallScore >= 25) return 'cold'
    return 'unqualified'
  }

  /**
   * Generate AI-powered summary (simplified version)
   * In production, would use OpenAI API
   */
  private async generateAISummary(input: CallAnalysisInput): Promise<string> {
    const responses = input.responses
    const duration = Math.round(input.callDuration / 60)
    
    // Build summary from available data
    let summary = `${duration} minute call`
    
    if (responses.length > 0) {
      summary += ` with ${responses.length} structured responses collected.`
      
      const contactInfo = responses.filter(r => 
        ['full_name', 'phone_number', 'email'].includes(r.fieldName)
      )
      
      if (contactInfo.length > 0) {
        summary += ` Contact information: ${contactInfo.map(r => r.fieldName).join(', ')}.`
      }
      
      const propertyInfo = responses.filter(r => 
        ['property_type', 'budget', 'location', 'timeline'].includes(r.fieldName)
      )
      
      if (propertyInfo.length > 0) {
        summary += ` Property preferences: ${propertyInfo.map(r => `${r.fieldName}: ${r.answerValue}`).join(', ')}.`
      }
    }
    
    return summary
  }

  /**
   * Generate recommended next steps
   */
  private generateNextSteps(
    qualificationStatus: CallAnalysisResult['qualificationStatus'],
    leadScore: number,
    topics: CallAnalysisResult['topics']
  ): string {
    const steps: string[] = []
    
    switch (qualificationStatus) {
      case 'hot_lead':
        steps.push('🔥 PRIORITY: Contact within 1 hour')
        steps.push('📞 Schedule property viewing/consultation')
        steps.push('📧 Send personalized property recommendations')
        break
        
      case 'qualified':
        steps.push('📞 Follow up within 24 hours')
        steps.push('📋 Send detailed information packet')
        if (topics.objections.length > 0) {
          steps.push(`❓ Address concerns: ${topics.objections.join(', ')}`)
        }
        break
        
      case 'needs_followup':
        steps.push('📅 Schedule follow-up call in 1 week')
        steps.push('📚 Send educational materials')
        steps.push('🔄 Add to nurture campaign')
        break
        
      case 'unqualified':
        steps.push('📝 Add to long-term nurture list')
        steps.push('📊 Monitor for future engagement')
        break
    }
    
    return steps.join('\n')
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    components: Array<{ score?: number; confidence?: number }>
  ): number {
    const confidences = components
      .map(c => c.confidence || Math.abs(c.score || 0))
      .filter(c => c > 0)
    
    if (confidences.length === 0) return 0.5
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  }
}