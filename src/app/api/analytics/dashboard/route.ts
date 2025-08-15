import { NextRequest, NextResponse } from 'next/server'
import { validatePinFromRequest } from '@/lib/pin-auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    // SIMPLIFIED PIN-based authentication (no sessions)
    const pinResult = await validatePinFromRequest(request)
    if (!pinResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: pinResult.error || 'PIN authentication required' }
      }, { status: 401 })
    }

    const { client_id } = pinResult
    const supabase = createServiceRoleClient('dashboard_analytics')
    
    // Get timeframe from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    
    // Use simplified database function to get dashboard analytics
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_dashboard_analytics_simple', { 
        client_id_input: client_id,
        days_back: days 
      })

    if (analyticsError) {
      console.error('[Dashboard Analytics] Database error:', analyticsError)
      throw new Error('Failed to fetch dashboard analytics')
    }

    // If no data, return empty analytics
    if (!analytics || analytics.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalCalls: 0,
            successRate: 0,
            avgCallDuration: 0,
            totalDurationHours: 0
          },
          recentCalls: []
        }
      })
    }
    
    const result = analytics[0]
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCalls: Number(result.total_calls) || 0,
          successRate: Number(result.success_rate) || 0,
          avgCallDuration: Number(result.avg_duration_minutes) || 0,
          totalDurationHours: Number(result.total_duration_hours) || 0
        },
        recentCalls: Array.isArray(result.recent_calls) ? result.recent_calls : []
      }
    })
    
  } catch (error) {
    console.error('GET analytics dashboard error:', error)
    return handleAPIError(error)
  }
}