import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase'

/**
 * POST /api/phone-numbers/cleanup
 * Clean up phone numbers that don't exist in VAPI
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest()
    const supabase = createServiceRoleClient()

    console.log(`Cleanup request for user: ${user.id}`)

    // Get all phone numbers for this user
    const { data: phoneNumbers } = await supabase
      .from('user_phone_numbers')
      .select('id, vapi_phone_id, phone_number, friendly_name')
      .eq('user_id', user.id)

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No phone numbers to clean up',
        cleaned: 0
      })
    }

    let cleanedCount = 0
    const cleanedNumbers = []

    // Check each phone number in VAPI  
    for (const phone of phoneNumbers) {
      try {
        console.log(`Checking phone number ${phone.phone_number} (${phone.vapi_phone_id}) in VAPI`)
        
        const response = await fetch(`https://api.vapi.ai/phone-number/${phone.vapi_phone_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
          }
        })

        if (response.status === 404) {
          // Phone number doesn't exist in VAPI - delete it completely
          console.log(`Phone ${phone.phone_number} not found in VAPI, deleting from database`)
          
          const { error } = await supabase
            .from('user_phone_numbers')
            .delete()
            .eq('id', phone.id)

          if (!error) {
            cleanedCount++
            cleanedNumbers.push({
              id: phone.id,
              number: phone.phone_number,
              name: phone.friendly_name
            })
          }
        } else if (response.ok) {
          // Phone exists - no action needed
          console.log(`Phone ${phone.phone_number} exists in VAPI`)
        }
      } catch (error) {
        console.error(`Error checking phone ${phone.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete. Removed ${cleanedCount} orphaned phone numbers.`,
      cleaned: cleanedCount,
      details: cleanedNumbers
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: { 
        code: 'CLEANUP_ERROR', 
        message: error instanceof Error ? error.message : 'Cleanup failed' 
      }
    }, { status: 500 })
  }
}