import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      app: true,
      database: false,
      vapi: false,
      environment: false
    }
  }

  try {
    // Check database connection
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('profiles').select('count').limit(1).single()
    checks.checks.database = !error

    // Check VAPI configuration
    checks.checks.vapi = !!process.env.VAPI_API_KEY

    // Check required environment variables
    const requiredEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ]
    checks.checks.environment = requiredEnvs.every(env => !!process.env[env])

    // Overall status
    const allHealthy = Object.values(checks.checks).every(check => check === true)
    checks.status = allHealthy ? 'healthy' : 'degraded'

    return NextResponse.json(checks, { 
      status: allHealthy ? 200 : 503 
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: checks.checks
    }, { status: 503 })
  }
}