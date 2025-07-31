import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

/**
 * GET /api/analytics/costs
 * Get total costs for a user across all assistants
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || user.id
    
    // Verify user can access this data (only their own or admin)
    if (userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' }
      }, { status: 403 })
    }

    const supabase = createServiceRoleClient()

    // Get total costs from calls table
    const { data: callCosts, error: callError } = await supabase
      .from('calls')
      .select('cost')
      .eq('user_id', userId)

    if (callError) {
      console.error('Error fetching call costs:', callError)
      throw callError
    }

    // Get total costs from call_logs table (if it exists)
    let callLogsCosts = []
    try {
      const { data: logCosts, error: logError } = await supabase
        .from('call_logs')
        .select('cost')
        .eq('user_id', userId)
      
      if (!logError && logCosts) {
        callLogsCosts = logCosts
      }
    } catch {
      // call_logs table might not exist yet, that's okay
      console.log('call_logs table not found, using calls table only')
    }

    // Calculate totals
    const totalFromCalls = callCosts?.reduce((sum, call) => sum + (call.cost || 0), 0) || 0
    const totalFromLogs = callLogsCosts.reduce((sum: number, log: any) => sum + (log.cost || 0), 0)
    const totalCost = totalFromCalls + totalFromLogs

    // Get call statistics
    const totalCalls = (callCosts?.length || 0) + callLogsCosts.length
    const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0

    return NextResponse.json({
      success: true,
      data: {
        totalCost: Number(totalCost.toFixed(2)),
        totalCalls,
        avgCostPerCall: Number(avgCostPerCall.toFixed(2)),
        remainingBudget: Number((10.00 - totalCost).toFixed(2)),
        budgetUsedPercentage: Number(((totalCost / 10.00) * 100).toFixed(1))
      }
    })

  } catch (error) {
    console.error('GET costs error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'COSTS_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to fetch costs' 
      }
    }, { status: 500 })
  }
}