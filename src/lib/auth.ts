import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import type { User } from '@supabase/supabase-js';

// =============================================
// CUSTOM ERROR CLASSES
// =============================================

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class SubscriptionError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public details?: Record<string, unknown>
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
  user: User;
  profile: Database['public']['Tables']['profiles']['Row'];
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
      .select('subscription_status, team_id')
      .eq('id', userId)
      .single();

    if (!profile) {
      return false;
    }

    // Check if user has active subscription
    if (profile.subscription_status === 'active') {
      return true;
    }

    // Check team subscription if user belongs to a team
    if (profile.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('plan_type')
        .eq('id', profile.team_id)
        .single();
      
      return team?.plan_type !== 'starter';
    }

    return false;
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
    
    // Get user's profile and team information
    const { data: profile } = await supabase
      .from('profiles')
      .select('team_id, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new SubscriptionError('User profile not found', 404);
    }

    // Get limits from team or use default limits
    let limits = {
      max_assistants: 1,
      max_minutes: 60,
      max_phone_numbers: 1,
      isPremium: false
    };

    if (profile.team_id) {
      const { data: team } = await supabase
        .from('teams')
        .select('max_assistants, max_minutes, plan_type')
        .eq('id', profile.team_id)
        .single();
      
      if (team) {
        limits = {
          max_assistants: team.max_assistants,
          max_minutes: team.max_minutes,
          max_phone_numbers: team.plan_type === 'starter' ? 1 : 5,
          isPremium: team.plan_type !== 'starter'
        };
      }
    } else if (profile.subscription_status === 'active') {
      limits = {
        max_assistants: 10,
        max_minutes: 1000,
        max_phone_numbers: 5,
        isPremium: true
      };
    }

    // Check resource-specific limits
    switch (resource) {
      case 'assistants':
        const { count: assistantCount } = await supabase
          .from('assistants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if ((assistantCount || 0) + increment > limits.max_assistants) {
          throw new SubscriptionError(
            limits.isPremium 
              ? `Assistant limit reached (${limits.max_assistants}).`
              : 'Assistant limit exceeded. Upgrade to premium for more assistants.',
            403,
            { 
              current: assistantCount, 
              limit: limits.max_assistants,
              isPremium: limits.isPremium
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

        if ((phoneCount || 0) + increment > limits.max_phone_numbers) {
          throw new SubscriptionError(
            limits.isPremium 
              ? `Phone number limit reached (${limits.max_phone_numbers}).`
              : 'Phone number limit exceeded. Upgrade to premium for more numbers.',
            403,
            { 
              current: phoneCount, 
              limit: limits.max_phone_numbers,
              isPremium: limits.isPremium
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

        if (totalMinutes + Math.ceil(increment / 60) > limits.max_minutes) {
          throw new SubscriptionError(
            limits.isPremium 
              ? `Monthly minute limit reached (${limits.max_minutes}).`
              : 'Monthly minute limit exceeded. Upgrade to premium for more minutes.',
            403,
            { 
              current: totalMinutes, 
              limit: limits.max_minutes,
              isPremium: limits.isPremium
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
): Promise<{ user: User; profile: Database['public']['Tables']['profiles']['Row'] }> {
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
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
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