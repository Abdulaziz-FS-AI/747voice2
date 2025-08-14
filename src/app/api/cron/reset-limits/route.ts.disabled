import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'
import { UsageLimitService } from '@/lib/services/usage-limit.service'

// GET /api/cron/reset-limits - Check and reset user limits
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('🔄 Starting daily limit reset check...')
    
    const supabase = createServiceRoleClient('cron_reset')
    const today = new Date()
    const todayDay = today.getDate()
    
    // Get all users whose signup anniversary is today
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, created_at, limit_enforced_at')
      .not('limit_enforced_at', 'is', null) // Only users with enforced limits
    
    if (error) {
      console.error('Failed to get users:', error)
      return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
    }
    
    let resetCount = 0
    
    for (const user of users || []) {
      const signupDate = new Date(user.created_at)
      const signupDay = signupDate.getDate()
      
      // Check if today is the monthly anniversary
      if (signupDay === todayDay) {
        console.log(`📅 Today is reset day for user ${user.email} (signed up on day ${signupDay})`)
        
        try {
          await UsageLimitService.resetUserLimits(user.id)
          resetCount++
          console.log(`✅ Reset limits for user ${user.email}`)
        } catch (error) {
          console.error(`Failed to reset limits for user ${user.id}:`, error)
        }
      }
    }
    
    console.log(`🔄 Limit reset check completed. Reset ${resetCount} users.`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Reset limits for ${resetCount} users`,
      totalChecked: users?.length || 0,
      resetCount
    })
    
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json({ 
      error: 'Reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST method for manual trigger (useful for testing)
export async function POST(request: NextRequest) {
  // Use same logic as GET
  return GET(request)
}