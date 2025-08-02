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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          name: string
          description: string | null
          base_prompt: string
          customizable_fields: Json
          voice_settings: Json | null
          is_active: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          base_prompt: string
          customizable_fields?: Json
          voice_settings?: Json | null
          is_active?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          base_prompt?: string
          customizable_fields?: Json
          voice_settings?: Json | null
          is_active?: boolean | null
          created_at?: string
        }
      }
      user_assistants: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          vapi_assistant_id: string
          name: string
          config: Json
          created_at: string
          updated_at: string
          is_disabled: boolean | null
          disabled_at: string | null
          disabled_reason: string | null
          original_vapi_config: Json | null
          assistant_state: 'active' | 'disabled_usage' | 'disabled_payment' | 'deleted' | null
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          vapi_assistant_id: string
          name: string
          config?: Json
          created_at?: string
          updated_at?: string
          is_disabled?: boolean | null
          disabled_at?: string | null
          disabled_reason?: string | null
          original_vapi_config?: Json | null
          assistant_state?: 'active' | 'disabled_usage' | 'disabled_payment' | 'deleted' | null
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          vapi_assistant_id?: string
          name?: string
          config?: Json
          created_at?: string
          updated_at?: string
          is_disabled?: boolean | null
          disabled_at?: string | null
          disabled_reason?: string | null
          original_vapi_config?: Json | null
          assistant_state?: 'active' | 'disabled_usage' | 'disabled_payment' | 'deleted' | null
        }
      }
      structured_questions: {
        Row: {
          id: string
          assistant_id: string
          form_title: string
          question_text: string
          structured_name: string
          data_type: 'string' | 'number' | 'boolean'
          is_required: boolean | null
          order_index: number
        }
        Insert: {
          id?: string
          assistant_id: string
          form_title: string
          question_text: string
          structured_name: string
          data_type: 'string' | 'number' | 'boolean'
          is_required?: boolean | null
          order_index: number
        }
        Update: {
          id?: string
          assistant_id?: string
          form_title?: string
          question_text?: string
          structured_name?: string
          data_type?: 'string' | 'number' | 'boolean'
          is_required?: boolean | null
          order_index?: number
        }
      }
      user_phone_numbers: {
        Row: {
          id: string
          user_id: string
          phone_number: string
          friendly_name: string
          vapi_phone_id: string
          vapi_credential_id: string | null
          assigned_assistant_id: string | null
          webhook_url: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          provider: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          assigned_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          phone_number: string
          friendly_name: string
          vapi_phone_id: string
          vapi_credential_id?: string | null
          assigned_assistant_id?: string | null
          webhook_url?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          assigned_at?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          phone_number?: string
          friendly_name?: string
          vapi_phone_id?: string
          vapi_credential_id?: string | null
          assigned_assistant_id?: string | null
          webhook_url?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          provider?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          assigned_at?: string | null
          notes?: string | null
        }
      }
      call_logs: {
        Row: {
          id: string
          assistant_id: string
          duration_seconds: number | null
          cost: number | null
          caller_number: string | null
          started_at: string
          transcript: string | null
          structured_data: Json | null
          success_evaluation: string | null
          summary: string | null
        }
        Insert: {
          id?: string
          assistant_id: string
          duration_seconds?: number | null
          cost?: number | null
          caller_number?: string | null
          started_at?: string
          transcript?: string | null
          structured_data?: Json | null
          success_evaluation?: string | null
          summary?: string | null
        }
        Update: {
          id?: string
          assistant_id?: string
          duration_seconds?: number | null
          cost?: number | null
          caller_number?: string | null
          started_at?: string
          transcript?: string | null
          structured_data?: Json | null
          success_evaluation?: string | null
          summary?: string | null
        }
      }
      call_analytics: {
        Row: {
          id: string
          user_id: string
          assistant_id: string | null
          date: string
          total_calls: number | null
          successful_calls: number | null
          failed_calls: number | null
          total_duration_minutes: number | null
          total_cost_cents: number | null
          average_call_duration: number | null
          success_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assistant_id?: string | null
          date: string
          total_calls?: number | null
          successful_calls?: number | null
          failed_calls?: number | null
          total_duration_minutes?: number | null
          total_cost_cents?: number | null
          average_call_duration?: number | null
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assistant_id?: string | null
          date?: string
          total_calls?: number | null
          successful_calls?: number | null
          failed_calls?: number | null
          total_duration_minutes?: number | null
          total_cost_cents?: number | null
          average_call_duration?: number | null
          success_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          key: string
          timestamp: string
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          key: string
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}