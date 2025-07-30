import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log all environment variables status
    const envStatus = {
      VAPI_API_KEY: !!process.env.VAPI_API_KEY,
      VAPI_WEBHOOK_SECRET: !!process.env.VAPI_WEBHOOK_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      MAKE_WEBHOOK_URL: !!process.env.MAKE_WEBHOOK_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    console.log('Test endpoint - Environment status:', envStatus);
    console.log('Test endpoint - Request body:', body);

    // Test basic VAPI connection
    if (process.env.VAPI_API_KEY) {
      const testResponse = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('VAPI test response status:', testResponse.status);
    }

    return NextResponse.json({
      success: true,
      message: 'Test endpoint working',
      envStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}