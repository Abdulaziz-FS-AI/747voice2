import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/analytics/leads - Get detailed leads data
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const quality = searchParams.get('quality') // hot, warm, cool, cold
    const offset = (page - 1) * limit
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('lead_analysis')
      .select('*', { count: 'exact' })
      .order('lead_score', { ascending: false })
      .range(offset, offset + limit - 1)

    if (quality) {
      query = query.eq('lead_quality', quality)
    }

    const { data: leads, error, count } = await query

    if (error) {
      console.error('Leads API error:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // Get lead statistics
    const { data: stats } = await supabase
      .from('extracted_leads')
      .select('lead_quality, lead_score, created_at')

    const leadStats = stats?.reduce((acc, lead) => {
      acc.total++
      acc.byQuality[lead.lead_quality] = (acc.byQuality[lead.lead_quality] || 0) + 1
      
      // Recent leads (last 7 days)
      const leadDate = new Date(lead.created_at)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      if (leadDate > weekAgo) {
        acc.recentCount++
      }
      
      return acc
    }, {
      total: 0,
      recentCount: 0,
      byQuality: { hot: 0, warm: 0, cool: 0, cold: 0 }
    }) || { total: 0, recentCount: 0, byQuality: { hot: 0, warm: 0, cool: 0, cold: 0 } }

    return NextResponse.json({
      success: true,
      data: {
        leads: leads || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        },
        stats: leadStats
      }
    })

  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}