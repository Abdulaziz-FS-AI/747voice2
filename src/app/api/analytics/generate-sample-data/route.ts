import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

// Only allow in development
const isDevelopment = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    if (!isDevelopment) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_ALLOWED', message: 'Sample data generation is only available in development' }
      }, { status: 403 })
    }

    // Authenticate user
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()
    
    // Get user's assistants
    const { data: assistants, error: assistantsError } = await supabase
      .from('user_assistants')
      .select('id, name')
      .eq('user_id', user.id)
    
    if (assistantsError || !assistants || assistants.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_ASSISTANTS', message: 'Please create an assistant first' }
      }, { status: 400 })
    }
    
    // Generate sample calls for the last 30 days
    const calls = []
    const phoneNumbers = [
      '+1234567890', '+0987654321', '+1112223333', '+4445556666', 
      '+7778889999', '+1231231234', '+3213214321', '+5555551234'
    ]
    
    const statuses = ['completed', 'completed', 'completed', 'failed', 'busy', 'no_answer'] // More completed for realistic success rate
    
    // Generate 50-100 calls
    const numCalls = Math.floor(Math.random() * 50) + 50
    
    for (let i = 0; i < numCalls; i++) {
      const daysAgo = Math.floor(Math.random() * 30)
      const hoursAgo = Math.floor(Math.random() * 24)
      const minutesAgo = Math.floor(Math.random() * 60)
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)
      startDate.setHours(startDate.getHours() - hoursAgo)
      startDate.setMinutes(startDate.getMinutes() - minutesAgo)
      
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const duration = status === 'completed' ? Math.floor(Math.random() * 300) + 30 : 0 // 30-330 seconds for completed calls
      const cost = duration > 0 ? Number((duration * 0.002 + Math.random() * 0.5).toFixed(2)) : 0 // ~$0.002 per second + random
      
      const endDate = new Date(startDate)
      endDate.setSeconds(endDate.getSeconds() + duration)
      
      calls.push({
        assistant_id: assistants[Math.floor(Math.random() * assistants.length)].id,
        user_id: user.id,
        caller_number: phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)],
        duration,
        cost,
        status,
        direction: Math.random() > 0.3 ? 'inbound' : 'outbound',
        started_at: startDate.toISOString(),
        ended_at: duration > 0 ? endDate.toISOString() : null
      })
    }
    
    // Insert calls in batches
    const batchSize = 10
    let inserted = 0
    
    for (let i = 0; i < calls.length; i += batchSize) {
      const batch = calls.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('calls')
        .insert(batch)
      
      if (insertError) {
        console.error('Error inserting batch:', insertError)
        // Continue with other batches
      } else {
        inserted += batch.length
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Generated ${inserted} sample calls for testing`,
        callsGenerated: inserted
      }
    })
    
  } catch (error) {
    console.error('POST generate sample data error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'GENERATION_ERROR', 
        message: error instanceof Error ? error.message : 'Failed to generate sample data' 
      }
    }, { status: 500 })
  }
}