/**
 * VAPI Fallback System
 * Provides graceful degradation when VAPI service is unavailable
 */

interface VAPIFallbackConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  fallbackMode: 'graceful' | 'minimal' | 'offline';
}

interface VAPIHealthStatus {
  isHealthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  avgResponseTime: number;
  errorRate: number;
}

interface FallbackAssistant {
  id: string;
  name: string;
  status: 'local' | 'degraded' | 'offline';
  capabilities: string[];
  limitations: string[];
}

class VAPIFallbackManager {
  private config: VAPIFallbackConfig;
  private healthStatus: VAPIHealthStatus;
  private fallbackAssistants: Map<string, FallbackAssistant> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<VAPIFallbackConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeoutMs: 30000,
      fallbackMode: 'graceful',
      ...config
    };

    this.healthStatus = {
      isHealthy: true,
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      avgResponseTime: 0,
      errorRate: 0
    };

    this.initializeHealthChecking();
  }

  /**
   * Check VAPI service health
   */
  async checkVAPIHealth(): Promise<VAPIHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simple health check - attempt to validate API key
      const response = await fetch('https://api.vapi.ai/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.healthStatus = {
          ...this.healthStatus,
          isHealthy: true,
          lastCheck: Date.now(),
          consecutiveFailures: 0,
          avgResponseTime: (this.healthStatus.avgResponseTime + responseTime) / 2
        };
      } else {
        this.recordFailure();
      }
    } catch (error) {
      console.warn('VAPI health check failed:', error);
      this.recordFailure();
    }

    return this.healthStatus;
  }

  private recordFailure() {
    this.healthStatus = {
      ...this.healthStatus,
      isHealthy: false,
      lastCheck: Date.now(),
      consecutiveFailures: this.healthStatus.consecutiveFailures + 1,
      errorRate: Math.min(this.healthStatus.errorRate + 0.1, 1.0)
    };
  }

  /**
   * Initialize periodic health checking
   */
  private initializeHealthChecking() {
    if (typeof window === 'undefined') { // Server-side only
      this.healthCheckInterval = setInterval(() => {
        this.checkVAPIHealth();
      }, 60000); // Check every minute
    }
  }

  /**
   * Execute VAPI operation with fallback
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: {
      operationType: string;
      assistantId?: string;
      userId?: string;
    }
  ): Promise<{ result: T; mode: 'primary' | 'fallback' | 'cached' }> {
    const { operationType, assistantId, userId } = context;
    
    // If VAPI is known to be unhealthy, go straight to fallback
    if (!this.healthStatus.isHealthy && this.healthStatus.consecutiveFailures >= 3) {
      console.warn(`VAPI unhealthy, using fallback for ${operationType}`);
      const result = await fallbackOperation();
      return { result, mode: 'fallback' };
    }

    // Try primary operation with retries
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeoutMs)
          )
        ]);
        
        // Success - reset failure count
        if (this.healthStatus.consecutiveFailures > 0) {
          this.healthStatus = {
            ...this.healthStatus,
            consecutiveFailures: 0,
            isHealthy: true,
            errorRate: Math.max(this.healthStatus.errorRate - 0.1, 0)
          };
        }
        
        return { result, mode: 'primary' };
      } catch (error) {
        console.warn(`VAPI operation failed (attempt ${attempt + 1}):`, error);
        this.recordFailure();
        
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    // All primary attempts failed, use fallback
    console.error(`VAPI operation '${operationType}' failed after ${this.config.maxRetries} attempts, using fallback`);
    
    try {
      const result = await fallbackOperation();
      return { result, mode: 'fallback' };
    } catch (fallbackError) {
      console.error(`Fallback operation also failed for '${operationType}':`, fallbackError);
      throw new Error(`Both primary and fallback operations failed for ${operationType}`);
    }
  }

  /**
   * Create fallback assistant (local mode)
   */
  async createFallbackAssistant(assistantData: {
    name: string;
    personality: string;
    config: any;
    userId: string;
  }): Promise<FallbackAssistant> {
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fallbackAssistant: FallbackAssistant = {
      id: fallbackId,
      name: assistantData.name,
      status: 'local',
      capabilities: [
        'Basic conversation',
        'Data collection',
        'Call logging'
      ],
      limitations: [
        'No real-time voice processing',
        'Limited AI capabilities',
        'Manual call initiation required',
        'Basic transcription only'
      ]
    };

    this.fallbackAssistants.set(fallbackId, fallbackAssistant);
    
    console.log(`Created fallback assistant: ${fallbackId} for user: ${assistantData.userId}`);
    
    return fallbackAssistant;
  }

  /**
   * Get fallback phone number (simulated)
   */
  async getFallbackPhoneNumber(): Promise<{
    id: string;
    number: string;
    status: 'fallback';
    instructions: string[];
  }> {
    return {
      id: 'fallback_phone',
      number: 'Not available in fallback mode',
      status: 'fallback',
      instructions: [
        'Voice service is temporarily unavailable',
        'Assistant created in local mode',
        'Features limited to data management',
        'Voice functionality will resume when service is restored'
      ]
    };
  }

  /**
   * Process call in fallback mode
   */
  async processFallbackCall(callData: {
    assistantId: string;
    duration?: number;
    transcript?: string;
    metadata?: any;
  }): Promise<{
    id: string;
    status: 'processed_offline';
    limitations: string[];
  }> {
    return {
      id: `fallback_call_${Date.now()}`,
      status: 'processed_offline',
      limitations: [
        'No real-time processing',
        'Limited transcript analysis',
        'Manual review required',
        'Reduced accuracy'
      ]
    };
  }

  /**
   * Get system status for UI display
   */
  getSystemStatus(): {
    mode: 'online' | 'degraded' | 'offline';
    message: string;
    capabilities: string[];
    limitations: string[];
  } {
    if (this.healthStatus.isHealthy) {
      return {
        mode: 'online',
        message: 'All systems operational',
        capabilities: [
          'Real-time voice processing',
          'AI-powered conversations',
          'Advanced analytics',
          'Full feature set'
        ],
        limitations: []
      };
    }

    if (this.healthStatus.consecutiveFailures < 5) {
      return {
        mode: 'degraded',
        message: 'Voice service experiencing issues',
        capabilities: [
          'Assistant creation (limited)',
          'Data management',
          'Basic analytics',
          'Call logging'
        ],
        limitations: [
          'Reduced voice processing',
          'Delayed responses',
          'Limited AI features'
        ]
      };
    }

    return {
      mode: 'offline',
      message: 'Voice service temporarily unavailable',
      capabilities: [
        'Assistant configuration',
        'Data management',
        'Historical analytics'
      ],
      limitations: [
        'No voice processing',
        'No real-time calls',
        'Limited functionality',
        'Manual operations only'
      ]
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Singleton instance
let fallbackManager: VAPIFallbackManager | null = null;

export function getVAPIFallbackManager(): VAPIFallbackManager {
  if (!fallbackManager) {
    fallbackManager = new VAPIFallbackManager();
  }
  return fallbackManager;
}

export type { VAPIFallbackConfig, VAPIHealthStatus, FallbackAssistant };
export { VAPIFallbackManager };