import { NextRequest, NextResponse } from 'next/server';
import { UsageEnforcementProcessor } from '@/lib/services/usage-enforcement-processor';
import { handleAPIError } from '@/lib/errors';

// POST /api/usage/process-enforcement - Process usage enforcement queue
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing usage enforcement queue...');
    
    // Verify this is an internal request (you might want to add authentication)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_TOKEN || 'internal-usage-processor';
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' }
      }, { status: 401 });
    }

    await UsageEnforcementProcessor.startProcessor();

    return NextResponse.json({
      success: true,
      message: 'Enforcement queue processed successfully'
    });

  } catch (error) {
    console.error('Error processing enforcement queue:', error);
    return handleAPIError(error);
  }
}

// GET /api/usage/process-enforcement - Get queue status
export async function GET(request: NextRequest) {
  try {
    const processor = new UsageEnforcementProcessor();
    const status = await processor.getQueueStatus();

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return handleAPIError(error);
  }
}