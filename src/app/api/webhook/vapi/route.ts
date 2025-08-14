import { NextRequest, NextResponse } from 'next/server'
import { PinWebhookProcessor } from '@/lib/pin-webhook-processor'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * VAPI Webhook Handler for PIN-based client system
 * Processes webhook events from VAPI and updates client call logs and analytics
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-vapi-signature')
    
    // Verify webhook signature if configured
    if (process.env.VAPI_WEBHOOK_SECRET) {
      if (!signature) {
        console.warn('[VAPI Webhook] Missing signature header')
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 401 }
        )
      }
      
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', process.env.VAPI_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')
      
      const receivedSignature = signature.replace('sha256=', '')
      
      if (expectedSignature !== receivedSignature) {
        console.warn('[VAPI Webhook] Invalid signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }
    
    // Parse the webhook payload
    const body = JSON.parse(rawBody)
    
    console.log(`[VAPI Webhook] Received ${body.type || 'unknown'} event`)

    // Validate required fields
    if (!body.type) {
      return NextResponse.json(
        { error: 'Missing event type' },
        { status: 400 }
      )
    }

    // Initialize webhook processor
    const processor = new PinWebhookProcessor()

    // Process the webhook event
    const result = await processor.processWebhookEvent(body.type, body)

    console.log(`[VAPI Webhook] Successfully processed ${body.type}`, {
      eventId: result.eventId,
      callId: result.callId
    })

    return NextResponse.json({
      success: true,
      message: `Event ${body.type} processed successfully`,
      eventId: result.eventId,
      processedAt: result.processedAt,
      data: result.data
    })

  } catch (error) {
    console.error('[VAPI Webhook] Processing error:', error)

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Webhook processing failed',
          message: error.message,
          type: error.constructor.name
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Handle webhook verification if needed by VAPI
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')

  if (challenge) {
    // Return challenge for webhook verification
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({ 
    status: 'VAPI webhook endpoint active',
    timestamp: new Date().toISOString()
  })
}