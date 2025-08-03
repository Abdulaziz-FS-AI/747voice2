/**
 * Security guard for service role client usage
 * Prevents misuse of service role key and adds auditing
 */

type ServiceRoleOperation = 
  | 'user_profile_creation'
  | 'usage_enforcement'
  | 'admin_operations'
  | 'system_maintenance'
  | 'webhook_processing'
  | 'analytics_calculation'
  | 'debug_operations';

interface ServiceRoleAuditLog {
  operation: ServiceRoleOperation;
  userId?: string;
  endpoint?: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// In-memory audit log (should be moved to database in production)
const auditLogs: ServiceRoleAuditLog[] = [];

/**
 * Audit service role usage
 */
export function auditServiceRoleUsage(
  operation: ServiceRoleOperation,
  options: {
    userId?: string;
    endpoint?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  } = {}
) {
  const auditEntry: ServiceRoleAuditLog = {
    operation,
    userId: options.userId,
    endpoint: options.endpoint,
    timestamp: new Date().toISOString(),
    riskLevel: options.riskLevel || 'medium'
  };
  
  auditLogs.push(auditEntry);
  
  // Keep only last 1000 entries in memory
  if (auditLogs.length > 1000) {
    auditLogs.splice(0, auditLogs.length - 1000);
  }
  
  // Log high-risk operations
  if (auditEntry.riskLevel === 'high') {
    console.warn('🚨 HIGH-RISK Service Role Operation:', auditEntry);
  } else {
    console.log('🔑 Service Role Operation:', auditEntry);
  }
}

/**
 * Check if service role operation is allowed
 */
export function isServiceRoleOperationAllowed(
  operation: ServiceRoleOperation,
  context: {
    endpoint?: string;
    userId?: string;
    userAgent?: string;
  } = {}
): boolean {
  // Block dangerous operations in production without explicit approval
  if (process.env.NODE_ENV === 'production') {
    const dangerousOperations: ServiceRoleOperation[] = [
      'debug_operations',
      'system_maintenance'
    ];
    
    if (dangerousOperations.includes(operation)) {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret || adminSecret.length < 32) {
        console.error('🚨 BLOCKED: Dangerous service role operation in production without ADMIN_SECRET');
        return false;
      }
    }
  }
  
  // Rate limiting: Max 1000 operations per minute
  const recentOps = auditLogs.filter(
    log => Date.now() - new Date(log.timestamp).getTime() < 60000
  );
  
  if (recentOps.length > 1000) {
    console.error('🚨 BLOCKED: Service role rate limit exceeded');
    return false;
  }
  
  return true;
}

/**
 * Get recent audit logs (for debugging)
 */
export function getServiceRoleAuditLogs(limit: number = 100): ServiceRoleAuditLog[] {
  return auditLogs.slice(-limit);
}

/**
 * Security wrapper for service role operations
 */
export function withServiceRoleAudit<T extends any[], R>(
  operation: ServiceRoleOperation,
  fn: (...args: T) => R,
  options: {
    riskLevel?: 'low' | 'medium' | 'high';
    context?: {
      endpoint?: string;
      userId?: string;
    };
  } = {}
) {
  return (...args: T): R => {
    const { riskLevel = 'medium', context = {} } = options;
    
    // Check if operation is allowed
    if (!isServiceRoleOperationAllowed(operation, context)) {
      throw new Error(`Service role operation '${operation}' is not allowed`);
    }
    
    // Audit the operation
    auditServiceRoleUsage(operation, {
      ...context,
      riskLevel
    });
    
    try {
      return fn(...args);
    } catch (error) {
      console.error(`Service role operation '${operation}' failed:`, error);
      throw error;
    }
  };
}