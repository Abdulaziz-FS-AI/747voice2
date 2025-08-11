import { NextRequest, NextResponse } from 'next/server';
import { createVapiAssistant } from '@/lib/vapi';
import { vapiClient } from '@/lib/vapi';

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
    
    // Test deletion immediately
    console.log('[TEST VAPI] Testing deletion...');
    if (vapiClient) {
      try {
        await vapiClient.deleteAssistant(assistantId);
        console.log('[TEST VAPI] ✅ Deletion successful!');
        
        return NextResponse.json({
          success: true,
          assistantId: assistantId,
          message: 'VAPI test successful - created and deleted assistant',
          operations: ['create', 'delete']
        });
      } catch (deleteError) {
        console.error('[TEST VAPI] ❌ Delete failed:', deleteError);
        
        return NextResponse.json({
          success: true,
          assistantId: assistantId,
          message: 'VAPI create successful but delete failed',
          operations: ['create'],
          deleteError: deleteError instanceof Error ? deleteError.message : String(deleteError)
        });
      }
    } else {
      return NextResponse.json({
        success: true,
        assistantId: assistantId,
        message: 'VAPI create successful (no client for delete test)',
        operations: ['create']
      });
    }
    
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

/**
 * Test VAPI connectivity by listing assistants
 * GET /api/test-vapi
 */
export async function GET() {
  try {
    console.log('[TEST VAPI] Testing VAPI list assistants...');
    
    if (!vapiClient) {
      return NextResponse.json({
        success: false,
        error: 'VAPI client not configured',
        hasApiKey: !!process.env.VAPI_API_KEY
      }, { status: 500 });
    }

    const assistants = await vapiClient.listAssistants();
    console.log('[TEST VAPI] ✅ Listed assistants:', assistants);

    return NextResponse.json({
      success: true,
      message: 'VAPI connectivity test successful',
      assistantCount: Array.isArray(assistants) ? assistants.length : 0,
      assistants: assistants
    });

  } catch (error) {
    console.error('[TEST VAPI] ❌ List error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        details: error
      }
    }, { status: 500 });
  }
}