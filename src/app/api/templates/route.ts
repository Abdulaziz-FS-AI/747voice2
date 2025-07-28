import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'

// GET /api/templates - Get all active prompt templates
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    // Get active templates
    const { data: templates, error } = await supabase
      .from('prompt_templates')
      .select(`
        id,
        industry,
        name,
        description,
        base_prompt,
        dynamic_slots,
        required_fields,
        first_message_template,
        template_questions (
          id,
          question_text,
          answer_description,
          structured_field_name,
          field_type,
          is_required,
          display_order
        )
      `)
      .eq('is_active', true)
      .order('industry')

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: templates || []
    })
  } catch (error) {
    return handleAPIError(error)
  }
}

// GET /api/templates/[id] - Get a specific template with questions
export async function GET_TEMPLATE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    const { data: template, error } = await supabase
      .from('prompt_templates')
      .select(`
        *,
        template_questions (
          id,
          question_text,
          answer_description,
          structured_field_name,
          field_type,
          is_required,
          display_order
        )
      `)
      .eq('id', params.id)
      .eq('is_active', true)
      .single()

    if (error) {
      throw error
    }

    if (!template) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: 'Template not found'
        }
      }, { status: 404 })
    }

    // Sort questions by display order
    if (template.template_questions) {
      template.template_questions.sort((a: any, b: any) => a.display_order - b.display_order)
    }

    return NextResponse.json({
      success: true,
      data: template
    })
  } catch (error) {
    return handleAPIError(error)
  }
}