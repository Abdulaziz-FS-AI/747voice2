import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[SIMPLE TEST] Starting direct VAPI test...');
    
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    
    if (!VAPI_API_KEY) {
      return NextResponse.json({ error: 'No VAPI API key' }, { status: 500 });
    }
    
    console.log('[SIMPLE TEST] Making direct fetch to VAPI...');
    
    const testAssistant = {
      name: `Simple Test ${Date.now()}`,
      voice: {
        voiceId: "Hana",
        provider: "vapi"
      },
      model: {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant."
          }
        ],
        provider: "openai",
        maxTokens: 500,
        temperature: 0.7
      },
      transcriber: {
        provider: "deepgram",
        model: "nova-3-general",
        language: "en"
      },
      firstMessage: "Hello! How can I help you today?",
      firstMessageMode: "assistant-speaks-first",
      maxDurationSeconds: 300,
      backgroundSound: "office",
      recordingEnabled: true,
      fillersEnabled: true,
      endCallFunctionEnabled: false,
      dialKeypadFunctionEnabled: false,
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.4
    };
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAssistant)
    });
    
    console.log('[SIMPLE TEST] Response status:', response.status);
    
    const data = await response.text();
    console.log('[SIMPLE TEST] Response data:', data);
    
    if (response.ok) {
      const assistant = JSON.parse(data);
      return NextResponse.json({
        success: true,
        assistantId: assistant.id,
        message: 'Simple VAPI test successful'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[SIMPLE TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}