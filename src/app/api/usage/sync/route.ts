import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { vapiClient } from '@/lib/vapi'
import { handleAPIError } from '@/lib/errors'

// POST /api/usage/sync - Sync usage data from VAPI
export async function POST(request: NextRequest) {
  try {
    if (!vapiClient) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VAPI_NOT_CONFIGURED',
          message: 'VAPI client not configured'
        }
      }, { status: 500 })
    }

    const supabase = createServiceRoleClient()
    
    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    // Get user's team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id, is_system_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'User team not found'
        }
      }, { status: 404 })
    }

    // Get recent calls from VAPI (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const vapiCalls = await vapiClient.listCalls(
      100, // limit
      sevenDaysAgo.toISOString()
    )

    let syncedCalls = 0
    let totalCostSynced = 0

    // Process each call from VAPI
    for (const vapiCall of vapiCalls.data || []) {
      try {
        // Check if we already have this call
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id, cost, vapi_call_id')
          .eq('vapi_call_id', vapiCall.id)
          .single()

        if (existingCall) {
          // Update cost data if different
          if (existingCall.cost !== vapiCall.cost) {
            const costBreakdown = vapiCall.costBreakdown || {}
            
            await supabase
              .from('calls')
              .update({
                cost: vapiCall.cost,
                ai_model_cost: costBreakdown.llm || 0,
                transcription_cost: costBreakdown.stt || 0,
                tts_cost: costBreakdown.tts || 0,
                phone_cost: costBreakdown.transport || 0,
                vapi_call_data: vapiCall,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingCall.id)

            // Update or create detailed cost record
            await supabase
              .from('call_costs')
              .upsert({
                call_id: existingCall.id,
                team_id: profile.team_id,
                total_cost: vapiCall.cost || 0,
                ai_model_cost: costBreakdown.llm || 0,
                transcription_cost: costBreakdown.stt || 0,
                tts_cost: costBreakdown.tts || 0,
                phone_cost: costBreakdown.transport || 0,
                vapi_cost_data: costBreakdown,
                updated_at: new Date().toISOString()
              })

            syncedCalls++
            totalCostSynced += (vapiCall.cost || 0) - existingCall.cost
          }
        }
      } catch (error) {
        console.error(`Failed to sync call ${vapiCall.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        syncedCalls,
        totalCostSynced: Math.round(totalCostSynced * 10000) / 10000, // 4 decimal places
        syncedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Usage sync error:', error)
    return handleAPIError(error)
  }
}

// GET /api/usage/sync - Get last sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get user from request
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    // Get user's team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile.team_id) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'User team not found'
        }
      }, { status: 404 })
    }

    // Get last sync info from team data
    const { data: team } = await supabase
      .from('teams')
      .select('updated_at, current_period_calls, current_period_cost')
      .eq('id', profile.team_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        lastSyncAt: team?.updated_at,
        currentPeriodCalls: team?.current_period_calls || 0,
        currentPeriodCost: team?.current_period_cost || 0
      }
    })

  } catch (error) {
    console.error('Get sync status error:', error)
    return handleAPIError(error)
  }
}