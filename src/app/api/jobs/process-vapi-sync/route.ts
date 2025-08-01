import { NextRequest, NextResponse } from 'next/server';
import { VapiSyncService } from '@/lib/services/vapi-sync.service';
import { headers } from 'next/headers';

// POST /api/jobs/process-vapi-sync - Process pending VAPI sync jobs
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal job call (add your own auth mechanism)
    const headersList = await headers();
    const authToken = headersList.get('x-internal-job-token');
    
    if (authToken !== process.env.INTERNAL_JOB_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const vapiSync = new VapiSyncService();
    
    // Process up to 20 jobs
    await vapiSync.processPendingJobs(20);
    
    return NextResponse.json({
      success: true,
      message: 'VAPI sync jobs processed'
    });
  } catch (error) {
    console.error('VAPI sync job error:', error);
    return NextResponse.json(
      { error: 'Job processing failed' },
      { status: 500 }
    );
  }
}

// This endpoint can be called by a cron job or scheduled task