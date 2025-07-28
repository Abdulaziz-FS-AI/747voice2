import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { handleAPIError } from '@/lib/errors'

// GET /api/pricing/plans - Get all active pricing plans
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data: plans, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: plans || []
    })
  } catch (error) {
    return handleAPIError(error)
  }
}