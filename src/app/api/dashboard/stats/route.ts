import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      totalAssistants: 0,
      activeCalls: 0,
      totalMinutes: 0,
      totalLeads: 0
    }
  });
}