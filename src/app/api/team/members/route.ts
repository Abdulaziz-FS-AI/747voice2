import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';

// Single-user architecture - team member management not available

// GET /api/team/members - Get all team members
export async function GET(request: NextRequest) {
  try {
    await authenticateRequest();
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Team member management is not available in single-user mode',
      },
    }, { status: 404 });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/team/members - Add new team member
export async function POST(request: NextRequest) {
  try {
    await authenticateRequest();
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Team member management is not available in single-user mode',
      },
    }, { status: 404 });
  } catch (error) {
    return handleAPIError(error);
  }
}