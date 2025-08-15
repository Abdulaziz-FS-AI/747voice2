// =============================================
// VOICE MATRIX DATABASE TYPES - PIN-BASED SYSTEM
// =============================================
// Simplified types for PIN-only authentication system
// =============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          pin: string
          company_name: string
          contact_email: string
          is_active: boolean
          pin_changed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pin: string
          company_name: string
          contact_email: string
          is_active?: boolean
          pin_changed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pin?: string
          company_name?: string
          contact_email?: string
          is_active?: boolean
          pin_changed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_assistants: {
        Row: {
          id: string
          client_id: string
          vapi_assistant_id: string
          display_name: string
          first_message: string | null
          voice: string | null
          model: string | null
          eval_method: string | null
          max_call_duration: number | null
          system_prompt: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          vapi_assistant_id: string
          display_name: string
          first_message?: string | null
          voice?: string | null
          model?: string | null
          eval_method?: string | null
          max_call_duration?: number | null
          system_prompt?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          vapi_assistant_id?: string
          display_name?: string
          first_message?: string | null
          voice?: string | null
          model?: string | null
          eval_method?: string | null
          max_call_duration?: number | null
          system_prompt?: string | null
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_phone_numbers: {
        Row: {
          id: string
          client_id: string
          vapi_phone_id: string
          phone_number: string
          friendly_name: string
          assigned_assistant_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          vapi_phone_id: string
          phone_number: string
          friendly_name: string
          assigned_assistant_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          vapi_phone_id?: string
          phone_number?: string
          friendly_name?: string
          assigned_assistant_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          assistant_id: string
          vapi_call_id: string | null
          evaluation: boolean | null
          caller_number: string | null
          transcript: string | null
          summary: string | null
          structured_data: Json | null
          started_at: string
          duration_seconds: number
        }
        Insert: {
          id?: string
          assistant_id: string
          vapi_call_id?: string | null
          evaluation?: boolean | null
          caller_number?: string | null
          transcript?: string | null
          summary?: string | null
          structured_data?: Json | null
          started_at?: string
          duration_seconds?: number
        }
        Update: {
          id?: string
          assistant_id?: string
          vapi_call_id?: string | null
          evaluation?: boolean | null
          caller_number?: string | null
          transcript?: string | null
          summary?: string | null
          structured_data?: Json | null
          started_at?: string
          duration_seconds?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_pin_simple: {
        Args: {
          pin_input: string
        }
        Returns: {
          valid: boolean
          client_id: string | null
          company_name: string | null
          error_message: string | null
        }[]
      }
      get_client_assistants: {
        Args: {
          client_id_input: string
        }
        Returns: {
          id: string
          vapi_assistant_id: string
          display_name: string
          first_message: string | null
          voice: string | null
          model: string | null
          eval_method: string | null
          max_call_duration: number | null
          system_prompt: string | null
          created_at: string
          updated_at: string
          last_synced_at: string | null
        }[]
      }
      get_dashboard_analytics_simple: {
        Args: {
          client_id_input: string
          days_back?: number
        }
        Returns: {
          total_calls: number
          success_rate: number
          avg_duration_minutes: number
          total_duration_hours: number
          recent_calls: Json
        }[]
      }
      change_pin_simple: {
        Args: {
          client_id_input: string
          current_pin_input: string
          new_pin_input: string
        }
        Returns: {
          success: boolean
          message: string
          error_code: string | null
        }[]
      }
      log_call_from_vapi: {
        Args: {
          vapi_call_id_input: string
          vapi_assistant_id_input: string
          caller_number_input?: string | null
          evaluation_input?: boolean | null
          transcript_input?: string | null
          summary_input?: string | null
          structured_data_input?: Json | null
          started_at_input?: string | null
          duration_seconds_input?: number
        }
        Returns: {
          success: boolean
          call_log_id: string | null
          message: string
        }[]
      }
      update_assistant: {
        Args: {
          assistant_id_input: string
          client_id_input: string
          display_name_input?: string
          first_message_input?: string
          voice_input?: string
          model_input?: string
          eval_method_input?: string
          max_call_duration_input?: number
        }
        Returns: {
          success: boolean
          message: string
          error_code: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for Voice Matrix system
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export type ClientAssistant = Database['public']['Tables']['client_assistants']['Row']
export type ClientAssistantInsert = Database['public']['Tables']['client_assistants']['Insert']
export type ClientAssistantUpdate = Database['public']['Tables']['client_assistants']['Update']

export type ClientPhoneNumber = Database['public']['Tables']['client_phone_numbers']['Row']
export type ClientPhoneNumberInsert = Database['public']['Tables']['client_phone_numbers']['Insert']
export type ClientPhoneNumberUpdate = Database['public']['Tables']['client_phone_numbers']['Update']

export type CallLog = Database['public']['Tables']['call_logs']['Row']
export type CallLogInsert = Database['public']['Tables']['call_logs']['Insert']
export type CallLogUpdate = Database['public']['Tables']['call_logs']['Update']

// PIN validation result
export interface PinValidationResult {
  valid: boolean
  client_id: string | null
  company_name: string | null
  error_message: string | null
}

// Dashboard analytics result
export interface DashboardAnalytics {
  total_calls: number
  success_rate: number
  avg_duration_minutes: number
  total_duration_hours: number
  recent_calls: any[]
}

// Assistant update result
export interface AssistantUpdateResult {
  success: boolean
  message: string
  error_code: string | null
}

// PIN change result
export interface PinChangeResult {
  success: boolean
  message: string
  error_code: string | null
}

// Call logging result
export interface CallLogResult {
  success: boolean
  call_log_id: string | null
  message: string
}

// Voice Matrix constants
export const VOICE_MATRIX = {
  PIN_LENGTH: 6,
  MAX_PIN_LENGTH: 8,
  MIN_PIN_LENGTH: 6,
  DEFAULT_ANALYTICS_DAYS: 30
} as const