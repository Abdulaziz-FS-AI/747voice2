import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { deleteVapiAssistant } from '@/lib/vapi';

// POST /api/cron/cleanup-expired-assistants - Cleanup expired demo assistants
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 [CLEANUP CRON] Starting expired assistants cleanup job');
    
    // Verify cron authorization (optional)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET || 'fallback-secret';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      console.warn('[CLEANUP CRON] Unauthorized cleanup attempt');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const supabase = createServiceRoleClient('cleanup_cron');
    const startTime = Date.now();

    console.log('🧹 [CLEANUP CRON] Running database cleanup function...');
    
    // Call the database function to cleanup expired assistants
    const { data: cleanupResult, error } = await supabase.rpc('cleanup_expired_assistants');

    if (error) {
      console.error('[CLEANUP CRON] Database cleanup failed:', error);
      throw error;
    }

    console.log('🧹 [CLEANUP CRON] Database cleanup result:', cleanupResult);

    const assistantsDeleted = cleanupResult?.assistants_deleted || 0;
    const usersAffected = cleanupResult?.users_affected || 0;

    // If we deleted any assistants, also try to clean them up in VAPI
    if (assistantsDeleted > 0) {
      console.log(`🧹 [CLEANUP CRON] Cleaning up ${assistantsDeleted} assistants from VAPI...`);
      
      // Get the assistants that were just marked as expired/deleted
      const { data: expiredAssistants } = await supabase
        .from('user_assistants')
        .select('vapi_assistant_id, name, user_id')
        .eq('assistant_state', 'expired')
        .not('vapi_assistant_id', 'is', null)
        .gte('deleted_at', new Date(startTime - 60000).toISOString()) // Last minute
        .limit(50); // Safety limit

      let vapiCleanupCount = 0;
      if (expiredAssistants && expiredAssistants.length > 0) {
        console.log(`🧹 [CLEANUP CRON] Found ${expiredAssistants.length} assistants to cleanup from VAPI`);
        
        // Delete from VAPI (with error handling per assistant)
        for (const assistant of expiredAssistants) {
          try {
            if (assistant.vapi_assistant_id) {
              await deleteVapiAssistant(assistant.vapi_assistant_id);
              vapiCleanupCount++;
              console.log(`🧹 [CLEANUP CRON] Deleted VAPI assistant: ${assistant.name} (${assistant.vapi_assistant_id})`);
            }
          } catch (vapiError) {
            console.error(`[CLEANUP CRON] Failed to delete VAPI assistant ${assistant.vapi_assistant_id}:`, vapiError);
            // Continue with other assistants - don't fail the entire job
          }
        }
      }

      console.log(`🧹 [CLEANUP CRON] VAPI cleanup complete: ${vapiCleanupCount}/${expiredAssistants?.length || 0} assistants deleted`);
    }

    const executionTime = Date.now() - startTime;

    console.log(`🧹 [CLEANUP CRON] ===== CLEANUP JOB COMPLETE =====`);
    console.log(`🧹 [CLEANUP CRON] Assistants deleted: ${assistantsDeleted}`);
    console.log(`🧹 [CLEANUP CRON] Users affected: ${usersAffected}`);
    console.log(`🧹 [CLEANUP CRON] Execution time: ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      data: {
        assistantsDeleted,
        usersAffected,
        vapiCleanupCount,
        executionTimeMs: executionTime,
        jobTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [CLEANUP CRON] Cleanup job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown cleanup error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}