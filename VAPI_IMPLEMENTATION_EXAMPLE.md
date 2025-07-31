# VAPI Server Messages Implementation Example

## Overview

This document shows exactly how VAPI server messages with headers are implemented in your Voice Matrix project and how to use them effectively with Make.com webhooks.

## 1. Current Implementation

Your Voice Matrix project now uses the updated VAPI API format with proper server configuration:

### Server Configuration in VAPI Assistant Creation

```typescript
// src/lib/vapi.ts - Lines 435-443

const serverConfig = {
  url: process.env.MAKE_WEBHOOK_URL || 'https://hook.eu2.make.com/m3olq7ealo40xevpjdar7573j2cst9uk',
  secret: process.env.MAKE_WEBHOOK_SECRET || 'k8sP2hGfD8jL5vZbN4pRqWcVfHjG5dEmP7sTzXyA1bC3eF6gHjKl',
  headers: {
    'X-API-Key': process.env.MAKE_WEBHOOK_SECRET || 'k8sP2hGfD8jL5vZbN4pRqWcVfHjG5dEmP7sTzXyA1bC3eF6gHjKl',
    'Content-Type': 'application/json'
  }
};

// Enhanced server messages for comprehensive webhook coverage
const serverMessages = [
  'conversation-update',      // Real-time conversation updates
  'function-call',           // Function calls (requires response)
  'end-of-call-report',      // Call analytics and summary  
  'tool-calls',              // Tool invocations (requires response)
  'transfer-destination-request', // Call transfers (requires response)
  'status-update',           // Call status changes
  'user-interrupted',        // When user interrupts assistant
  'speech-update',           // Speech recognition updates
  'hang'                     // When call is hung up
];
```

## 2. Environment Variables Setup

Add these to your `.env.local` file:

```bash
# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key_here

# Make.com Integration
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/your_webhook_id
MAKE_WEBHOOK_SECRET=your_make_webhook_secret_key
```

## 3. What Each Header Does

### Authentication & Content Headers
- **`X-API-Key: ${MAKE_WEBHOOK_SECRET}`** - Authenticates the webhook request with Make.com
- **`Content-Type: application/json`** - Specifies the content type for the webhook payload

This minimal configuration ensures compatibility with Make.com webhooks while keeping the implementation simple and focused. All contextual information (user ID, assistant ID, call ID, phone number, timestamp) is available in the webhook payload body sent by VAPI.

## 4. Server Messages Explained

### Messages that Require Response
These webhook events expect your server to respond with instructions:

```typescript
// Function calls - When assistant needs to call a custom function
'function-call': {
  // Your webhook must return function result
  // Response format: { "result": "function response data" }
}

// Tool calls - When assistant invokes a tool  
'tool-calls': {
  // Your webhook must return tool execution result
  // Response format: { "result": { "toolName": "result" } }
}

// Transfer requests - When assistant wants to transfer call
'transfer-destination-request': {
  // Your webhook must return transfer destination
  // Response format: { "destination": { "type": "number", "number": "+1234567890" } }
}
```

### Messages for Monitoring/Analytics
These events are for logging and don't require responses:

```typescript
'conversation-update': // Real-time conversation transcript
'end-of-call-report': // Complete call summary with analytics
'status-update': // Call status changes (ringing, answered, ended)
'user-interrupted': // When user interrupts the assistant
'speech-update': // Speech-to-text updates
'hang': // When call is terminated
```

## 5. Example Webhook Handler

Create a webhook endpoint to handle these messages:

```typescript
// src/app/api/webhooks/vapi/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const body = await request.json();
    
    // Verify authentication
    const apiKey = headersList.get('x-api-key');
    const expectedApiKey = process.env.MAKE_WEBHOOK_SECRET;
    
    if (apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Extract context from webhook payload (VAPI includes this in the body)
    const context = {
      userId: body.message?.userId || body.userId,
      assistantId: body.message?.assistantId || body.assistantId,
      callId: body.message?.callId || body.callId,
      phoneNumber: body.message?.phoneNumber || body.phoneNumber,
      timestamp: body.message?.timestamp || body.timestamp
    };
    
    console.log('VAPI Webhook received:', {
      messageType: body.message?.type,
      context,
      timestamp: new Date().toISOString()
    });
    
    const messageType = body.message?.type;
    
    switch (messageType) {
      case 'conversation-update':
        return handleConversationUpdate(body, context);
        
      case 'function-call':
        return handleFunctionCall(body, context);
        
      case 'end-of-call-report':
        return handleCallReport(body, context);
        
      case 'tool-calls':
        return handleToolCalls(body, context);
        
      case 'transfer-destination-request':
        return handleTransferRequest(body, context);
        
      case 'status-update':
        return handleStatusUpdate(body, context);
        
      case 'user-interrupted':
        return handleUserInterrupted(body, context);
        
      case 'speech-update':
        return handleSpeechUpdate(body, context);
        
      case 'hang':
        return handleHangup(body, context);
        
      default:
        console.log('Unhandled message type:', messageType);
        return NextResponse.json({ success: true });
    }
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

// Example handler functions
async function handleConversationUpdate(body: any, context: any) {
  // Store real-time conversation updates
  console.log('Conversation update:', body.message);
  return NextResponse.json({ success: true });
}

async function handleFunctionCall(body: any, context: any) {
  // Handle custom function calls
  const functionName = body.message?.functionCall?.name;
  const parameters = body.message?.functionCall?.parameters;
  
  console.log(`Function call: ${functionName}`, parameters);
  
  // Return function result
  return NextResponse.json({
    result: `Function ${functionName} executed successfully`
  });
}

async function handleCallReport(body: any, context: any) {
  // Store call analytics
  const report = body.message;
  console.log('Call ended:', {
    duration: report.duration,
    cost: report.cost,
    transcript: report.transcript,
    summary: report.summary
  });
  
  // Store in database for analytics
  // await storeCallReport(context.userId, context.callId, report);
  
  return NextResponse.json({ success: true });
}

async function handleTransferRequest(body: any, context: any) {
  // Handle call transfer requests
  const transferReason = body.message?.transferReason;
  
  console.log('Transfer requested:', transferReason);
  
  // Return transfer destination
  return NextResponse.json({
    destination: {
      type: "number",
      number: "+1234567890", // Your transfer number
      message: "Transferring you to a human agent..."
    }
  });
}

// ... other handler functions
```

## 6. Testing Your Webhook

Test your webhook configuration:

```bash
# Test the webhook endpoint directly
curl -X POST https://your-app.com/api/webhooks/vapi \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-webhook-secret" \
  -d '{
    "message": {
      "type": "conversation-update",
      "transcript": "Hello, how can I help you?",
      "timestamp": "2025-01-31T10:00:00Z",
      "userId": "test-user-123",
      "assistantId": "test-assistant-456",
      "callId": "test-call-789"
    }
  }'
```

## 7. Make.com Integration

In your Make.com scenario:

1. **Webhook Trigger**: Use the VAPI webhook as the trigger
2. **Authentication**: Verify the `Authorization` header
3. **Context Extraction**: Use the `X-*` headers for context
4. **Message Processing**: Route based on `message.type`
5. **Response**: Send appropriate responses for function calls

## 8. Security Best Practices

1. **Always verify the Authorization header**
2. **Use HTTPS for all webhook endpoints**
3. **Implement rate limiting on webhook endpoints**
4. **Log webhook events for debugging**
5. **Store webhook secrets in environment variables**
6. **Validate message structure before processing**

This implementation gives you comprehensive webhook coverage with proper authentication and context passing for your Voice Matrix application!