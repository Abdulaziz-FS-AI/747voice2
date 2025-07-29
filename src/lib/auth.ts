// Mock auth functions for non-authenticated mode

export class AuthError extends Error {
  public statusCode: number
  public details?: Record<string, unknown>
  
  constructor(message: string, statusCode = 401, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AuthError'
    this.statusCode = statusCode
    this.details = details
  }
}

export class SubscriptionError extends Error {
  public statusCode: number
  public details?: Record<string, unknown>
  
  constructor(message: string, statusCode = 402, details?: Record<string, unknown>) {
    super(message)
    this.name = 'SubscriptionError'
    this.statusCode = statusCode
    this.details = details
  }
}

export async function authenticateRequest() {
  return {
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'user@example.com' },
    profile: { 
      id: '00000000-0000-0000-0000-000000000001', 
      onboarding_completed: true
    }
  }
}

// Overloaded function signatures
export async function requirePermission(): Promise<{
  user: { id: string; email: string };
  profile: { id: string; onboarding_completed: boolean };
}>;
export async function requirePermission(permission: string): Promise<{
  user: { id: string; email: string };
  profile: { id: string; onboarding_completed: boolean };
}>;
export async function requirePermission(userId: string, permission: string): Promise<boolean>;
export async function requirePermission(userIdOrPermission?: string, permission?: string): Promise<any> {
  if (userIdOrPermission && permission) {
    // Old API: return boolean when called with 2 parameters
    return true
  }
  // New API: return user object when called with 0 or 1 parameters
  return {
    user: { id: '00000000-0000-0000-0000-000000000001', email: 'user@example.com' },
    profile: { 
      id: '00000000-0000-0000-0000-000000000001', 
      onboarding_completed: true
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