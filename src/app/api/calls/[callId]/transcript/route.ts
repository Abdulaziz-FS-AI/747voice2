import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';

// GET /api/calls/[callId]/transcript - Get call transcript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ callId: string }> }
) {
  try {
    const params = await context.params;
    const { user, profile } = await authenticateRequest();
    const { callId } = params;
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const format = searchParams.get('format') || 'json'; // json, text, srt
    const includeTimestamps = searchParams.get('timestamps') === 'true';

    // Check permissions
    const hasPermission = await requirePermission(user.id, 'view_calls');
    if (!hasPermission) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to view call transcripts',
        },
      }, { status: 403 });
    }

    const supabase = createServiceRoleClient();

    // Verify call access
    const callQuery = supabase
      .from('calls')
      .select('id, caller_number, duration, created_at')
      .eq('id', callId)
      .eq('user_id', user.id);

    const { data: call, error: callError } = await callQuery.single();

    if (callError || !call) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CALL_NOT_FOUND',
          message: 'Call not found',
        },
      }, { status: 404 });
    }

    // Get transcript entries
    const { data: transcriptEntries, error } = await supabase
      .from('call_transcripts')
      .select('*')
      .eq('call_id', callId)
      .order('timestamp_offset', { ascending: true });

    if (error) {
      throw error;
    }

    if (!transcriptEntries || transcriptEntries.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'TRANSCRIPT_NOT_FOUND',
          message: 'No transcript available for this call',
        },
      }, { status: 404 });
    }

    // Format transcript based on requested format
    switch (format) {
      case 'text':
        const textTranscript = transcriptEntries
          .map(entry => {
            const timestamp = includeTimestamps ? 
              `[${formatTimestamp(entry.timestamp_offset)}] ` : '';
            const speaker = entry.speaker !== 'system' ? 
              `${entry.speaker}: ` : '';
            return `${timestamp}${speaker}${entry.content}`;
          })
          .join('\n');

        return new NextResponse(textTranscript, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="transcript-${callId}.txt"`,
          },
        });

      case 'srt':
        const srtTranscript = transcriptEntries
          .map((entry, index) => {
            const startTime = formatSRTTimestamp(entry.timestamp_offset);
            const endTime = formatSRTTimestamp(
              entry.timestamp_offset + (entry.content.length * 0.1) // Estimate duration
            );
            
            return [
              index + 1,
              `${startTime} --> ${endTime}`,
              `${entry.speaker}: ${entry.content}`,
              '',
            ].join('\n');
          })
          .join('\n');

        return new NextResponse(srtTranscript, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="transcript-${callId}.srt"`,
          },
        });

      case 'json':
      default:
        return NextResponse.json({
          success: true,
          data: {
            call: {
              id: call.id,
              caller_number: call.caller_number,
              duration: call.duration,
              created_at: call.created_at,
            },
            transcript: transcriptEntries.map(entry => ({
              id: entry.id,
              speaker: entry.speaker,
              content: entry.content,
              timestamp: entry.timestamp_offset,
              created_at: entry.created_at,
            })),
            metadata: {
              total_entries: transcriptEntries.length,
              total_duration: call.duration,
              format: 'json',
            },
          },
        });
    }
  } catch (error) {
    return handleAPIError(error);
  }
}

// Helper function to format timestamp as MM:SS
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Helper function to format timestamp for SRT format (HH:MM:SS,mmm)
function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}