import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';

// Single-user architecture - team member management not available

// GET /api/team/members/[memberId] - Get specific team member
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
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

// PUT /api/team/members/[memberId] - Update team member
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
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

// DELETE /api/team/members/[memberId] - Remove team member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
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