import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, logAuditEvent } from '@/lib/auth';
import { handleAPIError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase';
import { z } from 'zod';

// Validation schema for creating notifications
const CreateNotificationSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'success', 'warning', 'error']),
  action_url: z.string().url().optional(),
  action_text: z.string().max(50).optional(),
  expires_at: z.string().datetime().optional(),
});

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const type = searchParams.get('type');

    const supabase = createServiceRoleClient();

    // For now, we'll generate notifications based on system events
    // In a real implementation, you'd have a notifications table
    const notifications = await generateUserNotifications(user.id, supabase);

    // Apply filters
    let filteredNotifications = notifications;
    
    if (unreadOnly) {
      filteredNotifications = notifications.filter(n => !n.read);
    }
    
    if (type) {
      filteredNotifications = notifications.filter(n => n.type === type);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedNotifications = filteredNotifications.slice(from, to);

    return NextResponse.json({
      success: true,
      data: paginatedNotifications,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit),
        unread_count: notifications.filter(n => !n.read).length,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

// POST /api/notifications - Create a notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest();
    const body = await request.json();

    // Only admins can create system notifications
    // You'd check permissions here

    // Validate input
    const validatedData = CreateNotificationSchema.parse(body);

    // In a real implementation, you'd store this in a notifications table
    // For now, we'll just log it
    await logAuditEvent({
      user_id: user.id,
      action: 'notification_created',
      resource_type: 'notification',
      new_values: validatedData,
    });

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...validatedData,
      created_at: new Date().toISOString(),
      read: false,
    };

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    }, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}

// Generate notifications based on user data
async function generateUserNotifications(userId: string, supabase: any) {
  const notifications: any[] = [];
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Get user profile with team info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, team:teams(*)')
      .eq('id', userId)
      .single();

    if (!profile) return notifications;

    // Check for overdue follow-ups
    let overdueQuery = supabase
      .from('leads')
      .select('id, first_name, last_name, next_follow_up_at')
      .lt('next_follow_up_at', now.toISOString())
      .neq('status', 'converted')
      .neq('status', 'lost');

    overdueQuery = overdueQuery.eq('user_id', userId);

    const { data: overdueLeads } = await overdueQuery.limit(5);

    if (overdueLeads && overdueLeads.length > 0) {
      notifications.push({
        id: 'overdue_followups',
        title: 'Overdue Follow-ups',
        message: `You have ${overdueLeads.length} overdue follow-up${overdueLeads.length > 1 ? 's' : ''} that need attention.`,
        type: 'warning',
        action_url: '/leads?status=overdue',
        action_text: 'View Leads',
        created_at: now.toISOString(),
        read: false,
      });
    }

    // Check for failed calls in the last 24 hours
    let failedCallsQuery = supabase
      .from('calls')
      .select('id, caller_number, assistant:assistants(name)')
      .eq('status', 'failed')
      .gte('created_at', last24Hours.toISOString());

    failedCallsQuery = failedCallsQuery.eq('user_id', userId);

    const { data: failedCalls } = await failedCallsQuery.limit(3);

    if (failedCalls && failedCalls.length > 0) {
      notifications.push({
        id: 'failed_calls',
        title: 'Failed Calls Alert',
        message: `${failedCalls.length} call${failedCalls.length > 1 ? 's' : ''} failed in the last 24 hours.`,
        type: 'error',
        action_url: '/calls?status=failed',
        action_text: 'View Calls',
        created_at: now.toISOString(),
        read: false,
      });
    }

    // Check for high-score leads in the last 24 hours
    let highScoreLeadsQuery = supabase
      .from('leads')
      .select('id, first_name, last_name, score')
      .gte('score', 85)
      .gte('created_at', last24Hours.toISOString());

    highScoreLeadsQuery = highScoreLeadsQuery.eq('user_id', userId);

    const { data: highScoreLeads } = await highScoreLeadsQuery.limit(3);

    if (highScoreLeads && highScoreLeads.length > 0) {
      notifications.push({
        id: 'high_score_leads',
        title: 'High-Quality Leads',
        message: `${highScoreLeads.length} high-quality lead${highScoreLeads.length > 1 ? 's' : ''} captured today!`,
        type: 'success',
        action_url: '/leads?min_score=85',
        action_text: 'View Leads',
        created_at: now.toISOString(),
        read: false,
      });
    }

    // Check subscription status
    if (profile.subscription_status === 'trial' && profile.trial_ends_at) {
      const trialEndDate = new Date(profile.trial_ends_at);
      const daysUntilTrial = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilTrial <= 3 && daysUntilTrial > 0) {
        notifications.push({
          id: 'trial_ending',
          title: 'Trial Ending Soon',
          message: `Your trial ends in ${daysUntilTrial} day${daysUntilTrial > 1 ? 's' : ''}. Upgrade to continue using all features.`,
          type: 'warning',
          action_url: '/settings/billing',
          action_text: 'Upgrade Now',
          created_at: now.toISOString(),
          read: false,
        });
      } else if (daysUntilTrial <= 0) {
        notifications.push({
          id: 'trial_expired',
          title: 'Trial Expired',
          message: 'Your trial has expired. Upgrade your plan to continue using Voice Matrix.',
          type: 'error',
          action_url: '/settings/billing',
          action_text: 'Upgrade Now',
          created_at: now.toISOString(),
          read: false,
        });
      }
    }

    // Check for assistant configuration issues
    let assistantsQuery = supabase
      .from('assistants')
      .select('id, name, vapi_assistant_id, is_active')
      .eq('is_active', true);

    assistantsQuery = assistantsQuery.eq('user_id', userId);

    const { data: assistants } = await assistantsQuery;

    const unconfiguredAssistants = assistants?.filter((a: any) => !a.vapi_assistant_id) || [];
    
    if (unconfiguredAssistants.length > 0) {
      notifications.push({
        id: 'unconfigured_assistants',
        title: 'Assistant Configuration Required',
        message: `${unconfiguredAssistants.length} assistant${unconfiguredAssistants.length > 1 ? 's' : ''} need to be configured with Vapi.`,
        type: 'warning',
        action_url: '/assistants',
        action_text: 'Configure',
        created_at: now.toISOString(),
        read: false,
      });
    }

  } catch (error) {
    console.error('Error generating notifications:', error);
  }

  return notifications.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}