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
          first_name: string | null
          last_name: string | null
          company_name: string | null
          phone: string | null
          onboarding_completed: boolean
          max_assistants: number
          max_minutes: number
          max_phone_numbers: number
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          phone?: string | null
          onboarding_completed?: boolean
          max_assistants?: number
          max_minutes?: number
          max_phone_numbers?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          company_name?: string | null
          phone?: string | null
          onboarding_completed?: boolean
          max_assistants?: number
          max_minutes?: number
          max_phone_numbers?: number
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          user_id: string
          number: string
          country_code: string
          vapi_phone_number_id: string | null
          is_active: boolean
          monthly_cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          number: string
          country_code: string
          vapi_phone_number_id?: string | null
          is_active?: boolean
          monthly_cost?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          number?: string
          country_code?: string
          vapi_phone_number_id?: string | null
          is_active?: boolean
          monthly_cost?: number
          created_at?: string
          updated_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          user_id: string
          name: string
          personality: 'professional' | 'friendly' | 'casual'
          company_name: string | null
          max_call_duration: number
          background_ambiance: string
          voice_id: string | null
          is_active: boolean
          vapi_assistant_id: string | null
          system_prompt: string | null
          first_message: string | null
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          personality?: 'professional' | 'friendly' | 'casual'
          company_name?: string | null
          max_call_duration?: number
          background_ambiance?: string
          voice_id?: string | null
          is_active?: boolean
          vapi_assistant_id?: string | null
          system_prompt?: string | null
          first_message?: string | null
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          personality?: 'professional' | 'friendly' | 'casual'
          company_name?: string | null
          max_call_duration?: number
          background_ambiance?: string
          voice_id?: string | null
          is_active?: boolean
          vapi_assistant_id?: string | null
          system_prompt?: string | null
          first_message?: string | null
          language?: string
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          vapi_call_id: string | null
          assistant_id: string
          phone_number_id: string | null
          user_id: string
          caller_number: string
          caller_name: string | null
          duration: number | null
          cost: number
          status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
          direction: 'inbound' | 'outbound'
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vapi_call_id?: string | null
          assistant_id: string
          phone_number_id?: string | null
          user_id: string
          caller_number: string
          caller_name?: string | null
          duration?: number | null
          cost?: number
          status?: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
          direction?: 'inbound' | 'outbound'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vapi_call_id?: string | null
          assistant_id?: string
          phone_number_id?: string | null
          user_id?: string
          caller_number?: string
          caller_name?: string | null
          duration?: number | null
          cost?: number
          status?: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
          direction?: 'inbound' | 'outbound'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      call_transcripts: {
        Row: {
          id: string
          call_id: string
          content: string
          speaker: string
          timestamp_offset: number
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          content: string
          speaker: string
          timestamp_offset?: number
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          content?: string
          speaker?: string
          timestamp_offset?: number
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          call_id: string | null
          user_id: string
          first_name: string | null
          last_name: string | null
          email: string | null
          phone: string
          lead_type: 'buyer' | 'seller' | 'investor' | 'renter' | null
          lead_source: string
          score: number
          status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          property_type: string[] | null
          budget_min: number | null
          budget_max: number | null
          preferred_locations: string[] | null
          timeline: string | null
          notes: string | null
          tags: string[] | null
          last_contact_at: string | null
          next_follow_up_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          user_id: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone: string
          lead_type?: 'buyer' | 'seller' | 'investor' | 'renter' | null
          lead_source?: string
          score?: number
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          property_type?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          preferred_locations?: string[] | null
          timeline?: string | null
          notes?: string | null
          tags?: string[] | null
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_id?: string | null
          user_id?: string
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          phone?: string
          lead_type?: 'buyer' | 'seller' | 'investor' | 'renter' | null
          lead_source?: string
          score?: number
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          property_type?: string[] | null
          budget_min?: number | null
          budget_max?: number | null
          preferred_locations?: string[] | null
          timeline?: string | null
          notes?: string | null
          tags?: string[] | null
          last_contact_at?: string | null
          next_follow_up_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_interactions: {
        Row: {
          id: string
          lead_id: string
          user_id: string
          interaction_type: string
          content: string | null
          scheduled_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          user_id: string
          interaction_type: string
          content?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          user_id?: string
          interaction_type?: string
          content?: string | null
          scheduled_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      analytics_snapshots: {
        Row: {
          id: string
          user_id: string
          date: string
          period_type: string
          total_calls: number | null
          successful_calls: number | null
          total_duration: number | null
          total_cost: number
          leads_generated: number | null
          conversion_rate: number
          avg_call_duration: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          period_type: string
          total_calls?: number | null
          successful_calls?: number | null
          total_duration?: number | null
          total_cost?: number
          leads_generated?: number | null
          conversion_rate?: number
          avg_call_duration?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          period_type?: string
          total_calls?: number | null
          successful_calls?: number | null
          total_duration?: number | null
          total_cost?: number
          leads_generated?: number | null
          conversion_rate?: number
          avg_call_duration?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_usage: {
        Args: {
          p_user_id: string
        }
        Returns: {
          current_assistants: number
          current_phone_numbers: number
          current_month_minutes: number
          current_month_calls: number
        }[]
      }
    }
    Enums: {
      personality_type: 'professional' | 'friendly' | 'casual'
      call_status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
      call_direction: 'inbound' | 'outbound'
      lead_type: 'buyer' | 'seller' | 'investor' | 'renter'
      lead_status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}