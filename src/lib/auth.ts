import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// =============================================
// CUSTOM ERROR CLASSES
// =============================================

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public details?: any
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

// =============================================
// AUTHENTICATION MIDDLEWARE
// =============================================

// Request authentication for API routes
export async function authenticateRequest(): Promise<{
  user: any;
  profile: any;
}> {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient(cookieStore);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new AuthError('Authentication required', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new AuthError('Profile not found', 404);
    }

    return { user, profile };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Authentication failed', 500);
  }
}

// Check if user is premium (simplified permission system)
export async function isPremiumUser(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return false;
    }

    return profile.is_premium && profile.subscription_status === 'active';
  } catch (error) {
    console.error('Premium check failed:', error);
    return false;
  }
}

// Simplified subscription limit checking for single tier
export async function checkSubscriptionLimits(
  userId: string,
  resource: 'assistants' | 'phone_numbers' | 'minutes',
  increment: number = 1
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    
    // Get user's profile and limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('max_assistants, max_minutes, max_phone_numbers, is_premium')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new SubscriptionError('User profile not found', 404);
    }

    // Check resource-specific limits
    switch (resource) {
      case 'assistants':
        const { count: assistantCount } = await supabase
          .from('assistants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if ((assistantCount || 0) + increment > profile.max_assistants) {
          throw new SubscriptionError(
            profile.is_premium 
              ? `Assistant limit reached (${profile.max_assistants}).`
              : 'Assistant limit exceeded. Upgrade to premium for more assistants.',
            403,
            { 
              current: assistantCount, 
              limit: profile.max_assistants,
              isPremium: profile.is_premium
            }
          );
        }
        break;

      case 'phone_numbers':
        const { count: phoneCount } = await supabase
          .from('phone_numbers')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if ((phoneCount || 0) + increment > profile.max_phone_numbers) {
          throw new SubscriptionError(
            profile.is_premium 
              ? `Phone number limit reached (${profile.max_phone_numbers}).`
              : 'Phone number limit exceeded. Upgrade to premium for more numbers.',
            403,
            { 
              current: phoneCount, 
              limit: profile.max_phone_numbers,
              isPremium: profile.is_premium
            }
          );
        }
        break;

      case 'minutes':
        // Get current month's usage
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: callsData } = await supabase
          .from('calls')
          .select('duration')
          .eq('user_id', userId)
          .gte('created_at', startOfMonth.toISOString());

        const totalMinutes = Math.ceil(
          (callsData?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0) / 60
        );

        if (totalMinutes + Math.ceil(increment / 60) > profile.max_minutes) {
          throw new SubscriptionError(
            profile.is_premium 
              ? `Monthly minute limit reached (${profile.max_minutes}).`
              : 'Monthly minute limit exceeded. Upgrade to premium for more minutes.',
            403,
            { 
              current: totalMinutes, 
              limit: profile.max_minutes,
              isPremium: profile.is_premium
            }
          );
        }
        break;
    }
  } catch (error) {
    if (error instanceof SubscriptionError) {
      throw error;
    }
    throw new SubscriptionError('Subscription check failed', 500);
  }
}

// Generate request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Permission checking for single-user system
export async function requirePermission(
  permission: string = 'basic'
): Promise<{ user: any; profile: any }> {
  try {
    const { user, profile } = await authenticateRequest();
    
    // In single-user system, all authenticated users have basic permissions
    // Premium permissions require subscription check
    if (permission === 'premium') {
      const isPremium = await isPremiumUser(user.id);
      if (!isPremium) {
        throw new SubscriptionError('Premium subscription required', 403);
      }
    }
    
    return { user, profile };
  } catch (error) {
    if (error instanceof AuthError || error instanceof SubscriptionError) {
      throw error;
    }
    throw new AuthError('Permission check failed', 500);
  }
}

// Audit logging
export async function logAuditEvent(event: {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    
    await supabase
      .from('audit_logs')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
  }
}