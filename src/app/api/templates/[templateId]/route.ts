import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { templateId } = params
    const supabase = createServiceClient()
    
    // Fetch specific template
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .eq('is_public', true)
      .single()

    if (error) {
      console.error('Failed to fetch template:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Template not found' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: template 
    })
  } catch (error) {
    console.error('Template API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}