import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { SubscriptionService } from '@/lib/services/subscription.service';

const subscriptionService = new SubscriptionService();

// GET /api/subscription - Get current subscription details
export async function GET(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    
    const subscription = await subscriptionService.getSubscription(user.id);
    const usage = await subscriptionService.getUsageDetails(user.id);
    
    return NextResponse.json({
      success: true,
      data: {
        subscription,
        usage
      }
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// PUT /api/subscription - Update subscription (upgrade/downgrade)
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    const body = await request.json();
    
    const { plan, stripeSubscriptionId } = body;
    
    if (!plan || !['free', 'pro'].includes(plan)) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan' }
      }, { status: 400 });
    }
    
    await subscriptionService.updateSubscription(user.id, plan, stripeSubscriptionId);
    
    return NextResponse.json({
      success: true,
      message: `Successfully ${plan === 'pro' ? 'upgraded to' : 'downgraded to'} ${plan} plan`
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// DELETE /api/subscription - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requirePermission('basic');
    
    await subscriptionService.cancelSubscription(user.id);
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    return handleAPIError(error);
  }
}