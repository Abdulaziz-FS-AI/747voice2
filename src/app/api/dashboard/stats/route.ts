import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { handleAPIError } from '@/lib/errors'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    // Get total assistants count
    const { count: totalAssistants } = await supabase
      .from('assistants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Get active calls count
    const { count: activeCalls } = await supabase
      .from('calls')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['initiated', 'ringing', 'answered'])

    // Get total minutes
    const { data: callsData } = await supabase
      .from('calls')
      .select('duration')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const totalMinutes = Math.round(
      (callsData?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0) / 60
    )

    // Get total leads
    const { count: totalLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      success: true,
      data: {
        totalAssistants: totalAssistants || 0,
        activeCalls: activeCalls || 0,
        totalMinutes,
        totalLeads: totalLeads || 0
      }
    })
  } catch (error) {
    return handleAPIError(error)
  }
}