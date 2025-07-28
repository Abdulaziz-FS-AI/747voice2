import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requirePermission, checkSubscriptionLimits, logAuditEvent } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'
import { makeClient } from '@/lib/make-client'
import { PromptBuilder, buildVapiFunctions } from '@/lib/prompt-builder'
import type { AssistantCustomization } from '@/lib/prompt-builder'

/**
 * HYBRID APPROACH: Database + Make.com + Vapi
 * 
 * Flow:
 * 1. User creates assistant in our UI
 * 2. We save to database
 * 3. Send to Make.com for processing
 * 4. Make.com creates in Vapi
 * 5. We update our database with Vapi ID
 */

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requirePermission('basic')
    const body = await request.json()

    await checkSubscriptionLimits(user.id, 'assistants', 1)

    const supabase = createServiceRoleClient()

    // Get template
    const { data: template } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', body.templateId || '00000000-0000-0000-0000-000000000002')
      .single()

    if (!template) {
      return NextResponse.json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      }, { status: 400 })
    }

    // Build prompts locally (for preview/validation)
    const customization: AssistantCustomization = {
      agentName: body.agentName,
      companyName: body.companyName,
      tone: body.tone,
      customInstructions: body.customInstructions,
      questions: body.questions
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt(template, customization)
    const firstMessage = PromptBuilder.buildFirstMessage(template, customization)
    const vapiFunctions = buildVapiFunctions(body.questions)

    // Save to database first
    const { data: assistant, error } = await supabase
      .from('assistants')
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        prompt_template_id: template.id,
        name: body.name,
        agent_name: body.agentName,
        company_name: body.companyName,
        tone: body.tone,
        custom_instructions: body.customInstructions,
        generated_system_prompt: systemPrompt,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        voice_id: body.voiceId,
        max_call_duration: body.maxCallDuration,
        language: body.language,
        personality: 'professional',
        is_active: false, // Not active until Vapi confirms
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !assistant) {
      throw new Error('Failed to create assistant in database')
    }

    // Save questions
    if (body.questions.length > 0) {
      const questionsToInsert = body.questions.map((q: any) => ({
        assistant_id: assistant.id,
        question_text: q.questionText,
        answer_description: q.answerDescription,
        structured_field_name: q.structuredFieldName,
        field_type: q.fieldType,
        is_required: q.isRequired,
        display_order: q.displayOrder
      }))

      await supabase.from('assistant_questions').insert(questionsToInsert)
    }

    // Send to Make.com for processing
    try {
      const makeResponse = await makeClient.createAssistant({
        assistant: {
          id: assistant.id,
          name: body.name,
          agentName: body.agentName,
          companyName: body.companyName,
          tone: body.tone,
          language: body.language,
          maxCallDuration: body.maxCallDuration
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: body.voiceId
        },
        generatedContent: {
          systemPrompt,
          firstMessage
        },
        structuredData: {
          questions: body.questions.map((q: any) => ({
            questionText: q.questionText,
            answerDescription: q.answerDescription,
            fieldName: q.structuredFieldName,
            fieldType: q.fieldType,
            isRequired: q.isRequired,
            order: q.displayOrder
          })),
          functions: vapiFunctions
        },
        webhookConfig: {
          url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/vapi`,
          secret: process.env.VAPI_WEBHOOK_SECRET || ''
        },
        metadata: {
          userId: user.id,
          teamId: profile.team_id || '',
          createdAt: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }
      })

      // Update assistant with Vapi ID if successful
      if (makeResponse.success && makeResponse.data?.vapiAssistantId) {
        await supabase
          .from('assistants')
          .update({ 
            vapi_assistant_id: makeResponse.data.vapiAssistantId,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', assistant.id)

        assistant.vapi_assistant_id = makeResponse.data.vapiAssistantId
        assistant.is_active = true
      } else {
        // Log warning but don't fail the request
        console.warn('Make.com processing completed but no Vapi ID returned')
      }

    } catch (makeError) {
      console.error('Make.com integration error:', makeError)
      
      // Don't fail the entire request - assistant is created locally
      return NextResponse.json({
        success: true,
        data: assistant,
        warning: 'Assistant created locally but external processing failed. You can retry deployment later.',
        canRetryDeployment: true
      }, { status: 201 })
    }

    // Log audit event
    await logAuditEvent({
      user_id: user.id,
      action: 'assistant_created',
      resource_type: 'assistant',
      resource_id: assistant.id,
      new_values: {
        name: assistant.name,
        vapi_assistant_id: assistant.vapi_assistant_id
      },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      success: true,
      data: assistant,
      message: 'Assistant created successfully'
    }, { status: 201 })

  } catch (error) {
    return handleAPIError(error)
  }
}

/**
 * Retry deployment endpoint for failed Make.com/Vapi deployments
 */
export async function POST_RETRY(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const { assistantId } = await request.json()

    const supabase = createServiceRoleClient()

    // Get assistant details
    const { data: assistant } = await supabase
      .from('assistants')
      .select('*, assistant_questions(*)')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (!assistant) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assistant not found' }
      }, { status: 404 })
    }

    if (assistant.vapi_assistant_id && assistant.is_active) {
      return NextResponse.json({
        success: false,
        error: { code: 'ALREADY_DEPLOYED', message: 'Assistant is already deployed' }
      }, { status: 400 })
    }

    // TODO: Retry Make.com deployment - commented out due to missing payload
    // const makeResponse = await makeClient.createAssistant({
    //   // ... same payload as above
    // })

    // TODO: Handle successful Make.com response - commented out
    // if (makeResponse.success && makeResponse.data?.vapiAssistantId) {
    //   await supabase
    //     .from('assistants')
    //     .update({ 
    //       vapi_assistant_id: makeResponse.data.vapiAssistantId,
    //       is_active: true,
    //       updated_at: new Date().toISOString()
    //     })
    //     .eq('id', assistant.id)

    //   return NextResponse.json({
    //     success: true,
    //     message: 'Assistant deployed successfully',
    //     vapiAssistantId: makeResponse.data.vapiAssistantId
    //   })
    // }

    throw new Error('Deployment retry failed')

  } catch (error) {
    return handleAPIError(error)
  }
}