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

// Note: Individual template access should be in /api/templates/[id]/route.ts
// This export was invalid for a route.ts file and has been commented out