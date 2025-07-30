// AI Model Configuration for Voice Matrix
// Revolutionary model selection with comprehensive metadata

export interface ModelOption {
  id: string                // API model name
  displayName: string       // User-friendly name
  category: ModelCategory   // Category group
  latency: number          // Average response time in ms
  costPer1k: number        // Cost per 1k tokens in USD
  tags: ModelTag[]         // Special attributes
  description: string      // Model capabilities
  region?: string          // For regional models
  badge?: ModelBadge       // Special badges
  maxTokens: number        // Maximum tokens supported
  contextWindow: number    // Context window size
  recommended?: boolean    // Voice Matrix recommendation
}

export type ModelCategory = 
  | 'gpt-4.1'       // Latest GPT-4.1 series
  | 'gpt-4o'        // Optimized GPT-4o series  
  | 'budget'        // Cost-effective options
  | 'specialized'   // Specialized models (o1, o3, etc)
  | 'regional'      // Regional clusters
  | 'realtime'      // Real-time models

export type ModelTag = 
  | 'fastest'       // Lowest latency
  | 'cheapest'      // Most cost-effective
  | 'recommended'   // Voice Matrix recommendation
  | 'new'          // Recently released
  | 'premium'      // High-performance
  | 'balanced'     // Good speed/cost ratio
  | 'advanced'     // Cutting-edge capabilities

export type ModelBadge = 
  | 'NEW'          // Newly released
  | 'RECOMMENDED'  // Voice Matrix recommended
  | 'FASTEST'      // Best performance
  | 'CHEAPEST'     // Most economical
  | 'PREMIUM'      // Advanced features

// Comprehensive model configuration
export const MODEL_OPTIONS: ModelOption[] = [
  // ===== GPT-4.1 Series (Latest & Most Advanced) =====
  {
    id: 'gpt-4.1-2025-04-14',
    displayName: 'GPT-4.1',
    category: 'gpt-4.1',
    latency: 700,
    costPer1k: 0.02,
    tags: ['new', 'premium', 'recommended'],
    description: 'Latest GPT-4.1 with enhanced reasoning and voice optimization',
    badge: 'NEW',
    maxTokens: 4096,
    contextWindow: 128000,
    recommended: true
  },
  {
    id: 'gpt-4.1-mini-2025-04-14',
    displayName: 'GPT-4.1 Mini',
    category: 'gpt-4.1',
    latency: 770,
    costPer1k: 0.01,
    tags: ['new', 'balanced'],
    description: 'Compact version of GPT-4.1 with excellent performance/cost ratio',
    badge: 'RECOMMENDED',
    maxTokens: 4096,
    contextWindow: 128000,
    recommended: true
  },
  {
    id: 'gpt-4.1-nano-2025-04-14',
    displayName: 'GPT-4.1 Nano',
    category: 'gpt-4.1',
    latency: 510,
    costPer1k: 0.01,
    tags: ['new', 'fastest', 'cheapest'],
    description: 'Ultra-fast GPT-4.1 variant optimized for voice applications',
    badge: 'FASTEST',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4.1',
    displayName: 'GPT-4.1 (Auto)',
    category: 'gpt-4.1',
    latency: 700,
    costPer1k: 0.02,
    tags: ['new', 'premium'],
    description: 'Automatically updated GPT-4.1 model',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4.1-mini',
    displayName: 'GPT-4.1 Mini (Auto)',
    category: 'gpt-4.1',
    latency: 770,
    costPer1k: 0.01,
    tags: ['new', 'balanced'],
    description: 'Automatically updated GPT-4.1 Mini model',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4.1-nano',
    displayName: 'GPT-4.1 Nano (Auto)',
    category: 'gpt-4.1',
    latency: 510,
    costPer1k: 0.01,
    tags: ['new', 'fastest'],
    description: 'Automatically updated GPT-4.1 Nano model',
    maxTokens: 4096,
    contextWindow: 128000
  },

  // ===== GPT-4o Series (Optimized Performance) =====
  {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    category: 'gpt-4o',
    latency: 600,
    costPer1k: 0.02,
    tags: ['premium', 'balanced'],
    description: 'Multimodal GPT-4o with excellent voice capabilities',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    category: 'gpt-4o',
    latency: 390,
    costPer1k: 0.01,
    tags: ['fastest', 'balanced'],
    description: 'Compact GPT-4o optimized for speed and efficiency',
    badge: 'FASTEST',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-2024-11-20',
    displayName: 'GPT-4o (Nov 2024)',
    category: 'gpt-4o',
    latency: 600,
    costPer1k: 0.02,
    tags: ['premium'],
    description: 'Latest stable GPT-4o release with enhanced capabilities',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-2024-08-06',
    displayName: 'GPT-4o (Aug 2024)',
    category: 'gpt-4o',
    latency: 620,
    costPer1k: 0.02,
    tags: ['premium'],
    description: 'Proven GPT-4o version with excellent stability',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    displayName: 'GPT-4o Mini (Jul 2024)',
    category: 'gpt-4o',
    latency: 390,
    costPer1k: 0.01,
    tags: ['fastest', 'balanced'],
    description: 'Stable GPT-4o Mini with proven performance',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'chatgpt-4o-latest',
    displayName: 'ChatGPT-4o Latest',
    category: 'gpt-4o',
    latency: 500,
    costPer1k: 0.02,
    tags: ['new', 'premium'],
    description: 'Latest ChatGPT-4o with conversational optimization',
    badge: 'NEW',
    maxTokens: 4096,
    contextWindow: 128000
  },

  // ===== Specialized Models =====
  {
    id: 'o3',
    displayName: 'o3',
    category: 'specialized',
    latency: 1200,
    costPer1k: 0.05,
    tags: ['premium', 'advanced'],
    description: 'Advanced reasoning model with superior problem-solving',
    badge: 'PREMIUM',
    maxTokens: 4096,
    contextWindow: 200000
  },
  {
    id: 'o3-mini',
    displayName: 'o3 Mini',
    category: 'specialized',
    latency: 900,
    costPer1k: 0.03,
    tags: ['advanced', 'balanced'],
    description: 'Compact o3 model with advanced reasoning capabilities',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'o1-mini',
    displayName: 'o1 Mini',
    category: 'specialized',
    latency: 800,
    costPer1k: 0.025,
    tags: ['advanced'],
    description: 'Reasoning-focused model for complex problem solving',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'o1-mini-2024-09-12',
    displayName: 'o1 Mini (Sep 2024)',
    category: 'specialized',
    latency: 800,
    costPer1k: 0.025,
    tags: ['advanced'],
    description: 'Stable o1 Mini release with proven reasoning capabilities',
    maxTokens: 4096,
    contextWindow: 128000
  },

  // ===== Real-time Models =====
  {
    id: 'gpt-4o-realtime-preview-2024-12-17',
    displayName: 'GPT-4o Realtime (Dec 2024)',
    category: 'realtime',
    latency: 200,
    costPer1k: 0.03,
    tags: ['fastest', 'premium'],
    description: 'Ultra-low latency GPT-4o for real-time voice interactions',
    badge: 'FASTEST',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-realtime-preview-2024-10-01',
    displayName: 'GPT-4o Realtime (Oct 2024)',
    category: 'realtime',
    latency: 220,
    costPer1k: 0.03,
    tags: ['fastest', 'premium'],
    description: 'Real-time GPT-4o optimized for voice applications',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4o-mini-realtime-preview-2024-12-17',
    displayName: 'GPT-4o Mini Realtime',
    category: 'realtime',
    latency: 150,
    costPer1k: 0.02,
    tags: ['fastest', 'balanced'],
    description: 'Ultra-fast mini model for real-time voice conversations',
    badge: 'FASTEST',
    maxTokens: 4096,
    contextWindow: 128000
  },

  // ===== Budget-Friendly Options =====
  {
    id: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    category: 'budget',
    latency: 800,
    costPer1k: 0.015,
    tags: ['balanced', 'cheapest'],
    description: 'Cost-effective GPT-4 with good performance',
    badge: 'CHEAPEST',
    maxTokens: 4096,
    contextWindow: 128000
  },
  {
    id: 'gpt-4',
    displayName: 'GPT-4',
    category: 'budget',
    latency: 900,
    costPer1k: 0.02,
    tags: ['balanced'],
    description: 'Classic GPT-4 model with proven reliability',
    maxTokens: 4096,
    contextWindow: 8192
  },
  {
    id: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    category: 'budget',
    latency: 400,
    costPer1k: 0.005,
    tags: ['fastest', 'cheapest'],
    description: 'Fast and economical option for simple voice tasks',
    badge: 'CHEAPEST',
    maxTokens: 4096,
    contextWindow: 16385
  },
  {
    id: 'gpt-3.5-turbo-0125',
    displayName: 'GPT-3.5 Turbo (Jan 2025)',
    category: 'budget',
    latency: 400,
    costPer1k: 0.005,
    tags: ['fastest', 'cheapest'],
    description: 'Latest GPT-3.5 with improved efficiency',
    maxTokens: 4096,
    contextWindow: 16385
  }
];

// Category metadata for UI organization
export const MODEL_CATEGORIES = {
  'gpt-4.1': {
    name: 'GPT-4.1 Series',
    description: 'Latest & Most Advanced',
    icon: '🚀',
    color: '#F5A623', // Voice Matrix golden
    gradient: 'linear-gradient(135deg, #F5A623 0%, #E09415 100%)'
  },
  'gpt-4o': {
    name: 'GPT-4o Series', 
    description: 'Optimized Performance',
    icon: '⚡',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
  },
  'specialized': {
    name: 'Specialized Models',
    description: 'Advanced Reasoning',
    icon: '🎯',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
  },
  'realtime': {
    name: 'Real-time Models',
    description: 'Ultra-Low Latency',
    icon: '🔥',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
  },
  'budget': {
    name: 'Budget-Friendly',
    description: 'Cost-Effective Options',
    icon: '💰',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
  },
  'regional': {
    name: 'Regional Clusters',
    description: 'Location-Specific',
    icon: '🌍',
    color: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
  }
} as const;

// Helper functions
export function getModelById(modelId: string): ModelOption | undefined {
  return MODEL_OPTIONS.find(model => model.id === modelId);
}

export function getModelsByCategory(category: ModelCategory): ModelOption[] {
  return MODEL_OPTIONS.filter(model => model.category === category);
}

export function getRecommendedModels(): ModelOption[] {
  return MODEL_OPTIONS.filter(model => model.recommended);
}

export function getFastestModels(): ModelOption[] {
  return MODEL_OPTIONS
    .filter(model => model.tags.includes('fastest'))
    .sort((a, b) => a.latency - b.latency);
}

export function getCheapestModels(): ModelOption[] {
  return MODEL_OPTIONS
    .filter(model => model.tags.includes('cheapest'))
    .sort((a, b) => a.costPer1k - b.costPer1k);
}

export function searchModels(query: string): ModelOption[] {
  const lowercaseQuery = query.toLowerCase();
  return MODEL_OPTIONS.filter(model => 
    model.displayName.toLowerCase().includes(lowercaseQuery) ||
    model.description.toLowerCase().includes(lowercaseQuery) ||
    model.tags.some(tag => tag.includes(lowercaseQuery))
  );
}