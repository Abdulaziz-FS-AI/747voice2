# VAPI Server Messages with Headers Configuration Guide

## Overview
This guide shows how to properly configure server messages with custom headers in VAPI assistants for your Voice Matrix project.

## 1. Server Configuration Structure

```typescript
interface VAPIServerConfig {
  url: string;                           // Your webhook endpoint URL
  timeoutSeconds?: number;               // Request timeout (default: 20s)
  headers?: Record<string, string>;      // Custom headers for authentication/metadata
  backoffPlan?: {                       // Retry configuration
    type: 'fixed' | 'exponential';
    maxRetries?: number;
    baseDelaySeconds?: number;
  };
}
```

## 2. Server Messages Array

Configure which webhook events you want to receive:

```typescript
const serverMessages = [
  'conversation-update',     // Real-time conversation updates
  'function-call',          // When assistant calls a function
  'hang',                   // When call is hung up
  'end-of-call-report',     // Call summary and analytics
  'speech-update',          // Speech recognition updates
  'status-update',          // Call status changes
  'tool-calls',             // Tool/function invocations
  'transfer-destination-request', // Call transfer requests
  'user-interrupted'        // When user interrupts assistant
];
```

## 3. Complete Assistant Configuration Example

```typescript
const assistantConfig = {
  name: "Customer Service Agent",
  model: {
    provider: "openai",
    model: "gpt-4.1-mini-2025-04-14",
    messages: [
      {
        role: "system",
        content: "You are a professional customer service representative..."
      }
    ],
    maxTokens: 500,
    temperature: 0.7
  },
  voice: {
    provider: "vapi",
    voiceId: "Elliot"
  },
  transcriber: {
    provider: "assembly-ai",
    language: "en"
  },
  firstMessage: "Hello! How can I help you today?",
  firstMessageMode: "assistant-speaks-first",
  maxDurationSeconds: 600,
  backgroundSound: "office",
  
  // Server configuration with custom headers
  server: {
    url: "https://your-app.com/api/webhooks/vapi",
    timeoutSeconds: 20,
    headers: {
      "Authorization": "Bearer your-webhook-secret",
      "X-Custom-Auth": "your-custom-auth-token",
      "X-Assistant-ID": "{{assistantId}}",        // Template variable
      "X-Call-ID": "{{callId}}",                  // Template variable
      "Content-Type": "application/json"
    },
    backoffPlan: {
      type: "exponential",
      maxRetries: 3,
      baseDelaySeconds: 1
    }
  },
  
  // Specify which server messages to receive
  serverMessages: [
    "conversation-update",
    "function-call", 
    "end-of-call-report",
    "tool-calls",
    "transfer-destination-request"
  ]
};
```

## 4. Make.com Integration Headers

For your Voice Matrix Make.com webhook integration:

```typescript
const makeWebhookConfig = {
  url: process.env.MAKE_WEBHOOK_URL, // Your Make.com webhook URL
  timeoutSeconds: 20,
  headers: {
    "Authorization": `Bearer ${process.env.MAKE_WEBHOOK_SECRET}`,
    "X-Webhook-Source": "voice-matrix",
    "X-User-ID": "{{userId}}",           // Will be replaced with actual user ID
    "X-Assistant-ID": "{{assistantId}}", // Will be replaced with assistant ID
    "X-Call-ID": "{{callId}}",          // Will be replaced with call ID
    "X-Phone-Number": "{{phoneNumber}}", // Will be replaced with phone number
    "Content-Type": "application/json"
  }
};
```

## 5. Webhook Response Handling

Your webhook endpoint should handle different message types:

```typescript
// /api/webhooks/vapi/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messageType = body.message?.type;
    
    switch (messageType) {
      case 'conversation-update':
        // Handle real-time conversation updates
        await handleConversationUpdate(body);
        break;
        
      case 'function-call':
        // Handle function calls and return responses
        return handleFunctionCall(body);
        
      case 'end-of-call-report':
        // Store call analytics and summary
        await storeCallReport(body);
        break;
        
      case 'tool-calls':
        // Handle tool invocations
        return handleToolCalls(body);
        
      case 'transfer-destination-request':
        // Handle call transfer requests
        return handleTransferRequest(body);
        
      default:
        console.log('Unhandled message type:', messageType);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

## 6. Template Variables in Headers

VAPI supports template variables in headers that get replaced at runtime:

- `{{assistantId}}` - The assistant's ID
- `{{callId}}` - The current call ID  
- `{{userId}}` - The user ID (if available)
- `{{phoneNumber}}` - The phone number being called
- `{{timestamp}}` - Current timestamp

## 7. Authentication Patterns

### Option 1: Bearer Token
```typescript
headers: {
  "Authorization": "Bearer your-secret-token"
}
```

### Option 2: Custom Auth Header
```typescript
headers: {
  "X-API-Key": "your-api-key",
  "X-Webhook-Secret": "your-webhook-secret"
}
```

### Option 3: Signature-based Auth
```typescript
headers: {
  "X-Signature": "sha256=calculated-signature",
  "X-Timestamp": "{{timestamp}}"
}
```

## 8. Error Handling and Retries

Configure retry behavior for failed webhook deliveries:

```typescript
server: {
  url: "https://your-app.com/webhook",
  timeoutSeconds: 20,
  headers: { /* your headers */ },
  backoffPlan: {
    type: "exponential",    // or "fixed"
    maxRetries: 3,          // Max retry attempts
    baseDelaySeconds: 1     // Initial delay
  }
}
```

## 9. Security Best Practices

1. **Use HTTPS**: Always use HTTPS endpoints for webhooks
2. **Validate Signatures**: Verify webhook signatures to ensure authenticity
3. **Rate Limiting**: Implement rate limiting on your webhook endpoints
4. **Timeout Handling**: Set appropriate timeout values (20s recommended)
5. **Secret Management**: Store webhook secrets in environment variables
6. **IP Whitelisting**: Consider whitelisting VAPI's IP ranges

## 10. Testing Your Configuration

Test your webhook configuration:

```bash
# Test webhook endpoint
curl -X POST https://your-app.com/api/webhooks/vapi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret" \
  -d '{"message": {"type": "conversation-update", "data": "test"}}'
```

This configuration ensures proper communication between VAPI and your Voice Matrix application with secure authentication and reliable message delivery.