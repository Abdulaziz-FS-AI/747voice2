import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';

// Single-user architecture - team management not available

// GET /api/team - Get team information
export async function GET(request: NextRequest) {
  try {
    await authenticateRequest();
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Team management is not available in single-user mode',
      },
    }, { status: 404 });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/team - Update team information
export async function PUT(request: NextRequest) {
  try {
    await authenticateRequest();
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Team management is not available in single-user mode',
      },
    }, { status: 404 });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/team - Delete team
export async function DELETE(request: NextRequest) {
  try {
    await authenticateRequest();
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FEATURE_DISABLED',
        message: 'Team management is not available in single-user mode',
      },
    }, { status: 404 });
  } catch (error) {
    return handleAPIError(error);
  }
}