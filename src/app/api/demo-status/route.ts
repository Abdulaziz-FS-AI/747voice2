import { NextRequest, NextResponse } from 'next/server';

// This endpoint is disabled in the Voice Matrix PIN-based system
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: { 
      code: 'ENDPOINT_DISABLED', 
      message: 'Demo status not available in PIN-based system' 
    }
  }, { status: 404 });
}