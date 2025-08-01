import { NextRequest, NextResponse } from 'next/server';
import { createVapiAssistant } from '@/lib/vapi';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST VAPI] Starting simple VAPI test...');
    
    // Create the simplest possible assistant
    const simpleAssistant = {
      name: 'Test Assistant ' + Date.now(),
      modelId: 'gpt-4o-mini',
      systemPrompt: 'You are a helpful assistant.',
      firstMessage: 'Hello! How can I help you today?',
      firstMessageMode: 'assistant-speaks-first' as const,
      voiceId: 'Elliot',
      maxDurationSeconds: 300,
      backgroundSound: 'office' as const,
      structuredQuestions: [],
      evaluationRubric: null,
      clientMessages: []
    };
    
    console.log('[TEST VAPI] Creating test assistant with minimal config...');
    
    const assistantId = await createVapiAssistant(simpleAssistant);
    
    console.log('[TEST VAPI] ✅ Success! Assistant ID:', assistantId);
    
    return NextResponse.json({
      success: true,
      assistantId: assistantId,
      message: 'VAPI test successful'
    });
    
  } catch (error) {
    console.error('[TEST VAPI] ❌ Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        details: error
      }
    }, { status: 500 });
  }
}