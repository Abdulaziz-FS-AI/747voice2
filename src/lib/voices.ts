// VAPI Voice Configuration for Voice Matrix
// Revolutionary voice selection with comprehensive metadata

export interface VoiceOption {
  id: string                // VAPI voice ID
  name: string             // Voice name
  age: number             // Age in years
  gender: 'Male' | 'Female'
  accent: string          // Accent/origin
  characteristics: VoiceCharacteristic[]  // Voice qualities
  personality: VoicePersonality[]        // Personality traits
  description: string     // Full description
  recommended?: boolean   // Voice Matrix recommendation
  category: VoiceCategory // Voice category
}

export type VoiceCharacteristic = 
  | 'Deeper tone'
  | 'Calming'
  | 'Clear'
  | 'Energetic'
  | 'Quippy'
  | 'Lighthearted'
  | 'Cheeky'
  | 'Amused'
  | 'Charming'
  | 'Soft'
  | 'Soothing'
  | 'Gentle'
  | 'Friendly'
  | 'Bright'
  | 'Optimistic'
  | 'Cheerful'
  | 'Professional'
  | 'Southern accent'

export type VoicePersonality = 
  | 'Professional'
  | 'Calming'
  | 'Energetic'
  | 'Friendly'
  | 'Soothing'

export type VoiceCategory = 
  | 'professional'  // Business and formal
  | 'friendly'      // Warm and approachable  
  | 'energetic'     // Upbeat and dynamic
  | 'soothing'      // Calm and gentle

// Comprehensive VAPI voice configuration
export const VAPI_VOICES: VoiceOption[] = [
  {
    id: 'Elliot',
    name: 'Elliot',
    age: 25,
    gender: 'Male',
    accent: 'Canadian',
    characteristics: ['Soothing', 'Friendly'],
    personality: ['Professional', 'Soothing'],
    description: '25 year old male, Canadian, Soothing, Friendly, Professional',
    recommended: true,
    category: 'professional'
  },
  {
    id: 'Kylie',
    name: 'Kylie',
    age: 23,
    gender: 'Female',
    accent: 'American',
    characteristics: [],
    personality: ['Friendly'],
    description: 'Age 23, Female, American',
    category: 'friendly'
  },
  {
    id: 'Rohan',
    name: 'Rohan',
    age: 24,
    gender: 'Male',
    accent: 'Indian American',
    characteristics: ['Bright', 'Optimistic', 'Cheerful', 'Energetic'],
    personality: ['Energetic', 'Friendly'],
    description: '24 years old male, Indian American, Bright, Optimistic, Cheerful, Energetic',
    category: 'energetic'
  },
  {
    id: 'Lily',
    name: 'Lily',
    age: 22,
    gender: 'Female',
    accent: 'American',
    characteristics: ['Clear', 'Professional'],
    personality: ['Professional'],
    description: '22 year old female, American, Clear, Professional',
    recommended: true,
    category: 'professional'
  },
  {
    id: 'Savannah',
    name: 'Savannah',
    age: 25,
    gender: 'Female',
    accent: 'American',
    characteristics: ['Southern accent'],
    personality: ['Friendly'],
    description: '25 years old female, American, Southern accent',
    category: 'friendly'
  },
  {
    id: 'Hana',
    name: 'Hana',
    age: 22,
    gender: 'Female',
    accent: 'Asian',
    characteristics: ['Soft', 'Soothing', 'Gentle'],
    personality: ['Soothing', 'Calming'],
    description: '22 years old female, Asian, Soft, Soothing, Gentle',
    category: 'soothing'
  },
  {
    id: 'Neha',
    name: 'Neha',
    age: 30,
    gender: 'Female',
    accent: 'Indian',
    characteristics: ['Charming'],
    personality: ['Professional'],
    description: '30 year old, Female, Indian, Professional, Charming',
    category: 'professional'
  },
  {
    id: 'Cole',
    name: 'Cole',
    age: 22,
    gender: 'Male',
    accent: 'White Male',
    characteristics: ['Deeper tone', 'Calming'],
    personality: ['Professional', 'Calming'],
    description: '22 year old white male, Deeper tone, Calming, Professional',
    recommended: true,
    category: 'professional'
  },
  {
    id: 'Harry',
    name: 'Harry',
    age: 24,
    gender: 'Male',
    accent: 'White Male',
    characteristics: ['Clear', 'Energetic'],
    personality: ['Professional', 'Energetic'],
    description: '24 year old white male, Clear, Energetic, Professional',
    category: 'professional'
  },
  {
    id: 'Paige',
    name: 'Paige',
    age: 26,
    gender: 'Female',
    accent: 'White Female',
    characteristics: ['Deeper tone', 'Calming'],
    personality: ['Professional', 'Calming'],
    description: '26 year old white female, Deeper tone, Calming, Professional',
    category: 'professional'
  },
  {
    id: 'Spencer',
    name: 'Spencer',
    age: 26,
    gender: 'Female',
    accent: 'American',
    characteristics: ['Energetic', 'Quippy', 'Lighthearted', 'Cheeky', 'Amused'],
    personality: ['Energetic', 'Friendly'],
    description: '26 year old, Female, Energetic, Quippy, Lighthearted, Cheeky, Amused',
    category: 'energetic'
  }
];

// Voice categories metadata
export const VOICE_CATEGORIES = {
  professional: {
    name: 'Professional',
    description: 'Clear, authoritative voices for business',
    icon: '👔',
    color: '#F5A623',
    gradient: 'linear-gradient(135deg, #F5A623 0%, #E09415 100%)'
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm, approachable voices',
    icon: '😊',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
  },
  energetic: {
    name: 'Energetic',
    description: 'Upbeat, dynamic voices',
    icon: '⚡',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
  },
  soothing: {
    name: 'Soothing',
    description: 'Calm, gentle voices',
    icon: '🌸',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
  }
} as const;

// Personality traits for multi-select
export const PERSONALITY_TRAITS = [
  { id: 'professional', label: 'Professional', description: 'Formal, business-focused', color: '#F5A623' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable', color: '#10B981' },
  { id: 'energetic', label: 'Energetic', description: 'Upbeat and dynamic', color: '#EF4444' },
  { id: 'calming', label: 'Calming', description: 'Peaceful and relaxing', color: '#8B5CF6' },
  { id: 'confident', label: 'Confident', description: 'Self-assured and decisive', color: '#3B82F6' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and caring', color: '#06B6D4' },
  { id: 'witty', label: 'Witty', description: 'Clever and humorous', color: '#F97316' },
  { id: 'patient', label: 'Patient', description: 'Tolerant and understanding', color: '#84CC16' },
  { id: 'knowledgeable', label: 'Knowledgeable', description: 'Well-informed and expert', color: '#6366F1' },
  { id: 'supportive', label: 'Supportive', description: 'Encouraging and helpful', color: '#EC4899' }
] as const;

// Helper functions
export function getVoiceById(voiceId: string): VoiceOption | undefined {
  return VAPI_VOICES.find(voice => voice.id === voiceId);
}

export function getVoicesByCategory(category: VoiceCategory): VoiceOption[] {
  return VAPI_VOICES.filter(voice => voice.category === category);
}

export function getRecommendedVoices(): VoiceOption[] {
  return VAPI_VOICES.filter(voice => voice.recommended);
}

export function getVoicesByGender(gender: 'Male' | 'Female'): VoiceOption[] {
  return VAPI_VOICES.filter(voice => voice.gender === gender);
}

export function searchVoices(query: string): VoiceOption[] {
  const lowercaseQuery = query.toLowerCase();
  return VAPI_VOICES.filter(voice => 
    voice.name.toLowerCase().includes(lowercaseQuery) ||
    voice.description.toLowerCase().includes(lowercaseQuery) ||
    voice.accent.toLowerCase().includes(lowercaseQuery) ||
    voice.characteristics.some(char => char.toLowerCase().includes(lowercaseQuery))
  );
}