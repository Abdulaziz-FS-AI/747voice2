// Mock auth functions for non-authenticated mode

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubscriptionError'
  }
}

export async function authenticateRequest() {
  return {
    user: { id: 'mock-user-id', email: 'user@example.com' },
    profile: { 
      id: 'mock-user-id', 
      onboarding_completed: true,
      team_id: 'mock-team-id'
    }
  }
}

// Overloaded function signatures
export async function requirePermission(): Promise<{
  user: { id: string; email: string };
  profile: { id: string; onboarding_completed: boolean; team_id: string };
}>;
export async function requirePermission(permission: string): Promise<{
  user: { id: string; email: string };
  profile: { id: string; onboarding_completed: boolean; team_id: string };
}>;
export async function requirePermission(userId: string, permission: string): Promise<boolean>;
export async function requirePermission(userIdOrPermission?: string, permission?: string): Promise<any> {
  if (userIdOrPermission && permission) {
    // Old API: return boolean when called with 2 parameters
    return true
  }
  // New API: return user object when called with 0 or 1 parameters
  return {
    user: { id: 'mock-user-id', email: 'user@example.com' },
    profile: { 
      id: 'mock-user-id', 
      onboarding_completed: true,
      team_id: 'mock-team-id'
    }
  }
}

export async function checkSubscriptionLimits(userId: string, resource: string, count?: number) {
  return true // Allow all operations in non-auth mode
}

export async function logAuditEvent(params: any) {
  // Mock audit logging
  console.log('Audit event:', params)
}