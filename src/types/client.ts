// Client-specific type definitions for PIN-based system

export interface Client {
  id: string
  pin: string
  company_name: string
  contact_email: string
  created_at: string
  updated_at: string
  is_active: boolean
  notes?: string
  pin_changed_at?: string
}

export interface ClientAssistant {
  id: string
  client_id: string
  vapi_assistant_id: string
  
  // Client-editable fields
  display_name: string
  first_message?: string
  voice?: string
  model?: string
  eval_method?: string
  max_call_duration?: number
  
  // Read-only fields (from VAPI)
  system_prompt?: string
  questions?: any[]
  
  // Metadata
  assigned_at: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface ClientPhoneNumber {
  id: string
  client_id: string
  vapi_phone_id: string
  phone_number: string
  friendly_name: string
  assigned_assistant_id?: string
  assistant_display_name?: string
  
  // Metadata
  assigned_at: string
  created_at: string
  updated_at: string
  is_active: boolean
  notes?: string
}

export interface CallLog {
  id: string
  client_id: string
  assistant_id: string
  phone_number_id?: string
  vapi_call_id?: string
  
  // Call details
  caller_number?: string
  call_time: string
  end_time?: string
  duration_seconds: number
  call_status: string
  call_type?: string
  
  // Call content
  transcript?: string
  recording_url?: string
  structured_data?: any
  success_evaluation?: boolean
  summary?: string
  
  // Cost tracking
  cost?: number
  
  // Assistant info cache
  assistant_display_name?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface CallAnalytics {
  id: string
  client_id: string
  assistant_id?: string
  call_log_id?: string
  
  // Analytics data
  date: string
  duration_seconds?: number
  cost?: number
  success_evaluation?: boolean
  
  // Aggregated fields for daily stats
  total_calls: number
  successful_calls: number
  failed_calls: number
  total_duration_seconds: number
  total_cost_cents: number
  average_call_duration: number
  success_rate: number
  
  // Call metadata
  has_recording?: boolean
  has_transcript?: boolean
  transcript_length?: number
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ClientSession {
  id: string
  client_id: string
  session_token: string
  ip_address?: string
  user_agent?: string
  created_at: string
  expires_at: string
  is_active: boolean
  last_accessed?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Client Dashboard Analytics
export interface DashboardAnalytics {
  total_calls: number
  successful_calls: number
  failed_calls: number
  total_duration_hours: number
  total_cost_dollars: number
  average_call_duration: number
  success_rate: number
  calls_by_day: Array<{
    date: string
    calls: number
    successful: number
    duration_minutes: number
    cost_dollars: number
  }>
  calls_by_assistant: Array<{
    assistant_name: string
    calls: number
    successful: number
    duration_minutes: number
    cost_dollars: number
  }>
}

// Assistant Update payload (only allowed fields)
export interface AssistantUpdatePayload {
  display_name?: string
  first_message?: string
  voice?: string
  model?: string
  eval_method?: string
  max_call_duration?: number
}

// PIN Change payload
export interface PinChangePayload {
  currentPin: string
  newPin: string
  email: string
}

// Client info for PIN auth context
export interface ClientInfo {
  id: string
  company_name: string
  contact_email: string
}

// Auth responses
export interface LoginResponse {
  client_id: string
  company_name: string
  session_token: string
  authenticated: boolean
}

export interface SessionValidationResponse {
  client_id: string
  company_name: string
  expires_at: string
}