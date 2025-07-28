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

export async function requirePermission(userId: string, permission: string) {
  return true // Allow all operations in non-auth mode
}

export async function checkSubscriptionLimits(userId: string, resource: string) {
  return true // Allow all operations in non-auth mode
}

export async function logAuditEvent(params: any) {
  // Mock audit logging
  console.log('Audit event:', params)
}