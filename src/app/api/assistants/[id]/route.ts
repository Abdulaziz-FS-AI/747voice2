import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return NextResponse.json({
    success: true,
    data: { 
      id: params.id, 
      name: 'Mock Assistant', 
      is_active: true,
      personality: 'professional',
      language: 'English'
    }
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const body = await request.json();
  return NextResponse.json({
    success: true,
    data: { id: params.id, ...body },
    message: 'Assistant updated successfully'
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return NextResponse.json({
    success: true,
    message: 'Assistant deleted successfully'
  });
}