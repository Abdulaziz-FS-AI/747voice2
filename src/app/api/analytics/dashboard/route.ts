import { NextRequest, NextResponse } from 'next/server'
import { validatePinSession } from '@/lib/pin-auth'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

// Helper function to calculate total cost from recent calls
function calculateTotalCost(recentCalls: any[]): number {
  if (!recentCalls || !Array.isArray(recentCalls)) return 0
  return recentCalls.reduce((total, call) => total + (Number(call.cost) || 0), 0)
}

export async function GET(request: NextRequest) {
  try {
    // PIN-based authentication
    const sessionResult = await validatePinSession(request)
    if (!sessionResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' }
      }, { status: 401 })
    }

    const { client_id } = sessionResult
    const supabase = createServiceRoleClient('dashboard_analytics')
    
    // Get timeframe from query params
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    
    // Use enhanced database function to get dashboard analytics with cost calculation
    const { data: analytics, error: analyticsError } = await supabase
      .rpc('get_dashboard_analytics_enhanced', { 
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
            totalCost: 0,
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
          totalCost: Number(result.total_cost) || 0, // Now properly calculated in database
          totalDurationHours: Number(result.total_duration_hours) || 0
        },
        recentCalls: result.recent_calls || []
      }
    })
    
  } catch (error) {
    console.error('GET analytics dashboard error:', error)
    return handleAPIError(error)
  }
}