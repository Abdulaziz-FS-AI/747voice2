import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Fetch active public templates
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to fetch templates:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch templates' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data: templates || [] 
    })
  } catch (error) {
    console.error('Templates API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}