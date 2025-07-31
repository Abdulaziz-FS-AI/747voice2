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
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          owner_id: string
          subscription_id: string | null
          plan_type: 'starter' | 'professional' | 'team' | 'enterprise'
          max_agents: number
          max_assistants: number
          max_minutes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_id: string
          subscription_id?: string | null
          plan_type?: 'starter' | 'professional' | 'team' | 'enterprise'
          max_agents?: number
          max_assistants?: number
          max_minutes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          owner_id?: string
          subscription_id?: string | null
          plan_type?: 'starter' | 'professional' | 'team' | 'enterprise'
          max_agents?: number
          max_assistants?: number
          max_minutes?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          company_name: string | null
          phone: string | null
          role: 'admin' | 'agent' | 'viewer'
          team_id: string | null
          subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
          trial_ends_at: string | null
          onboarding_completed: boolean
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
          role?: 'admin' | 'agent' | 'viewer'
          team_id?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
          trial_ends_at?: string | null
          onboarding_completed?: boolean
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
          role?: 'admin' | 'agent' | 'viewer'
          team_id?: string | null
          subscription_status?: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
          trial_ends_at?: string | null
          onboarding_completed?: boolean
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
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
          prompt_template_id: string | null
          agent_name: string | null
          tone: 'professional' | 'friendly' | 'casual' | null
          custom_instructions: string | null
          generated_system_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
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
          prompt_template_id?: string | null
          agent_name?: string | null
          tone?: 'professional' | 'friendly' | 'casual' | null
          custom_instructions?: string | null
          generated_system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
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
          prompt_template_id?: string | null
          agent_name?: string | null
          tone?: 'professional' | 'friendly' | 'casual' | null
          custom_instructions?: string | null
          generated_system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assistant_questions: {
        Row: {
          id: string
          assistant_id: string
          question_text: string
          answer_description: string | null
          structured_field_name: string
          field_type: 'string' | 'number' | 'boolean'
          is_required: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          question_text: string
          answer_description?: string | null
          structured_field_name: string
          field_type: 'string' | 'number' | 'boolean'
          is_required?: boolean
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          question_text?: string
          answer_description?: string | null
          structured_field_name?: string
          field_type?: 'string' | 'number' | 'boolean'
          is_required?: boolean
          display_order?: number
          created_at?: string
        }
      }
      prompt_templates: {
        Row: {
          id: string
          industry: string
          name: string
          description: string | null
          base_prompt: string
          dynamic_slots: Json
          default_values: Json
          required_fields: Json
          first_message_template: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          industry: string
          name: string
          description?: string | null
          base_prompt: string
          dynamic_slots?: Json
          default_values?: Json
          required_fields?: Json
          first_message_template?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          industry?: string
          name?: string
          description?: string | null
          base_prompt?: string
          dynamic_slots?: Json
          default_values?: Json
          required_fields?: Json
          first_message_template?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      template_questions: {
        Row: {
          id: string
          template_id: string
          question_text: string
          answer_description: string | null
          structured_field_name: string
          field_type: 'string' | 'number' | 'boolean'
          is_required: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          question_text: string
          answer_description?: string | null
          structured_field_name: string
          field_type: 'string' | 'number' | 'boolean'
          is_required?: boolean
          display_order: number
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          question_text?: string
          answer_description?: string | null
          structured_field_name?: string
          field_type?: 'string' | 'number' | 'boolean'
          is_required?: boolean
          display_order?: number
          created_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          vapi_call_id: string | null
          assistant_id: string
          phone_number_id: string | null
          user_id: string
          team_id: string | null
          caller_number: string
          caller_name: string | null
          duration: number
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
          team_id?: string | null
          caller_number: string
          caller_name?: string | null
          duration?: number
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
          team_id?: string | null
          caller_number?: string
          caller_name?: string | null
          duration?: number
          cost?: number
          status?: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer'
          direction?: 'inbound' | 'outbound'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          call_id: string | null
          user_id: string
          team_id: string | null
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
          team_id?: string | null
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
          team_id?: string | null
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
      call_transcripts: {
        Row: {
          id: string
          call_id: string
          transcript_text: string | null
          speakers: Json
          word_timestamps: Json
          summary: string | null
          language: string
          confidence_score: number | null
          processing_status: string
          vapi_transcript_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id: string
          transcript_text?: string | null
          speakers?: Json
          word_timestamps?: Json
          summary?: string | null
          language?: string
          confidence_score?: number | null
          processing_status?: string
          vapi_transcript_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          transcript_text?: string | null
          speakers?: Json
          word_timestamps?: Json
          summary?: string | null
          language?: string
          confidence_score?: number | null
          processing_status?: string
          vapi_transcript_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_responses: {
        Row: {
          id: string
          call_id: string
          assistant_id: string
          question_id: string | null
          function_name: string | null
          question_text: string
          answer_value: string | null
          answer_type: string
          answer_confidence: number | null
          field_name: string | null
          is_required: boolean
          collection_method: string
          vapi_message_id: string | null
          collected_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          assistant_id: string
          question_id?: string | null
          function_name?: string | null
          question_text: string
          answer_value?: string | null
          answer_type?: string
          answer_confidence?: number | null
          field_name?: string | null
          is_required?: boolean
          collection_method?: string
          vapi_message_id?: string | null
          collected_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          assistant_id?: string
          question_id?: string | null
          function_name?: string | null
          question_text?: string
          answer_value?: string | null
          answer_type?: string
          answer_confidence?: number | null
          field_name?: string | null
          is_required?: boolean
          collection_method?: string
          vapi_message_id?: string | null
          collected_at?: string | null
          created_at?: string
        }
      }
      call_analysis: {
        Row: {
          id: string
          call_id: string
          assistant_id: string
          user_id: string
          lead_score: number | null
          qualification_status: string
          lead_quality: string
          sentiment_score: number | null
          sentiment_label: string | null
          emotional_tone: string | null
          primary_intent: string | null
          secondary_intents: string[] | null
          property_type: string | null
          urgency_level: string | null
          budget_range: string | null
          key_topics: string[] | null
          objections: string[] | null
          pain_points: string[] | null
          interests: string[] | null
          call_duration_seconds: number | null
          agent_talk_time_percentage: number | null
          caller_engagement_score: number | null
          questions_answered: number
          total_questions: number
          ai_summary: string | null
          next_steps: string | null
          agent_notes: string | null
          crm_notes: string | null
          analysis_version: string
          processing_status: string
          analysis_model: string
          confidence_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          call_id: string
          assistant_id: string
          user_id: string
          lead_score?: number | null
          qualification_status?: string
          lead_quality?: string
          sentiment_score?: number | null
          sentiment_label?: string | null
          emotional_tone?: string | null
          primary_intent?: string | null
          secondary_intents?: string[] | null
          property_type?: string | null
          urgency_level?: string | null
          budget_range?: string | null
          key_topics?: string[] | null
          objections?: string[] | null
          pain_points?: string[] | null
          interests?: string[] | null
          call_duration_seconds?: number | null
          agent_talk_time_percentage?: number | null
          caller_engagement_score?: number | null
          questions_answered?: number
          total_questions?: number
          ai_summary?: string | null
          next_steps?: string | null
          agent_notes?: string | null
          crm_notes?: string | null
          analysis_version?: string
          processing_status?: string
          analysis_model?: string
          confidence_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          assistant_id?: string
          user_id?: string
          lead_score?: number | null
          qualification_status?: string
          lead_quality?: string
          sentiment_score?: number | null
          sentiment_label?: string | null
          emotional_tone?: string | null
          primary_intent?: string | null
          secondary_intents?: string[] | null
          property_type?: string | null
          urgency_level?: string | null
          budget_range?: string | null
          key_topics?: string[] | null
          objections?: string[] | null
          pain_points?: string[] | null
          interests?: string[] | null
          call_duration_seconds?: number | null
          agent_talk_time_percentage?: number | null
          caller_engagement_score?: number | null
          questions_answered?: number
          total_questions?: number
          ai_summary?: string | null
          next_steps?: string | null
          agent_notes?: string | null
          crm_notes?: string | null
          analysis_version?: string
          processing_status?: string
          analysis_model?: string
          confidence_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          event_type: string
          event_data: Json
          call_id: string | null
          vapi_call_id: string | null
          processing_status: string
          error_message: string | null
          retry_count: number
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          event_data: Json
          call_id?: string | null
          vapi_call_id?: string | null
          processing_status?: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          event_data?: Json
          call_id?: string | null
          vapi_call_id?: string | null
          processing_status?: string
          error_message?: string | null
          retry_count?: number
          processed_at?: string | null
          created_at?: string
        }
      }
      phone_numbers: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          friendly_name: string
          phone_number: string
          provider: string
          provider_config: Json
          is_active: boolean
          is_verified: boolean
          verification_status: string
          verification_error: string | null
          assigned_assistant_id: string | null
          assigned_at: string | null
          total_calls: number
          total_minutes: number
          last_call_at: string | null
          webhook_url: string | null
          webhook_events: string[]
          notes: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          friendly_name: string
          phone_number: string
          provider?: string
          provider_config?: Json
          is_active?: boolean
          is_verified?: boolean
          verification_status?: string
          verification_error?: string | null
          assigned_assistant_id?: string | null
          assigned_at?: string | null
          total_calls?: number
          total_minutes?: number
          last_call_at?: string | null
          webhook_url?: string | null
          webhook_events?: string[]
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          friendly_name?: string
          phone_number?: string
          provider?: string
          provider_config?: Json
          is_active?: boolean
          is_verified?: boolean
          verification_status?: string
          verification_error?: string | null
          assigned_assistant_id?: string | null
          assigned_at?: string | null
          total_calls?: number
          total_minutes?: number
          last_call_at?: string | null
          webhook_url?: string | null
          webhook_events?: string[]
          notes?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          assistant_id: string
          duration_seconds: number
          cost: number
          caller_number: string
          started_at: string
          transcript: string | null
          structured_data: Json | null
          success_evaluation: Json | null
          summary: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          duration_seconds: number
          cost: number
          caller_number: string
          started_at: string
          transcript?: string | null
          structured_data?: Json | null
          success_evaluation?: Json | null
          summary?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          duration_seconds?: number
          cost?: number
          caller_number?: string
          started_at?: string
          transcript?: string | null
          structured_data?: Json | null
          success_evaluation?: Json | null
          summary?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      phone_number_call_logs: {
        Row: {
          id: string
          phone_number_id: string
          call_id: string | null
          direction: string
          caller_number: string | null
          called_number: string | null
          call_status: string | null
          provider_call_id: string | null
          provider_data: Json
          duration_seconds: number
          cost_cents: number
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          phone_number_id: string
          call_id?: string | null
          direction: string
          caller_number?: string | null
          called_number?: string | null
          call_status?: string | null
          provider_call_id?: string | null
          provider_data?: Json
          duration_seconds?: number
          cost_cents?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          phone_number_id?: string
          call_id?: string | null
          direction?: string
          caller_number?: string | null
          called_number?: string | null
          call_status?: string | null
          provider_call_id?: string | null
          provider_data?: Json
          duration_seconds?: number
          cost_cents?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      provider_configurations: {
        Row: {
          id: string
          user_id: string
          provider: string
          configuration_name: string
          config_data: Json
          is_active: boolean
          is_default: boolean
          is_verified: boolean
          last_verified_at: string | null
          verification_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          configuration_name: string
          config_data: Json
          is_active?: boolean
          is_default?: boolean
          is_verified?: boolean
          last_verified_at?: string | null
          verification_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          configuration_name?: string
          config_data?: Json
          is_active?: boolean
          is_default?: boolean
          is_verified?: boolean
          last_verified_at?: string | null
          verification_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analysis_triggers: {
        Row: {
          id: string
          trigger_type: string
          trigger_config: Json
          action_type: string
          action_config: Json
          user_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trigger_type: string
          trigger_config: Json
          action_type: string
          action_config: Json
          user_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trigger_type?: string
          trigger_config?: Json
          action_type?: string
          action_config?: Json
          user_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
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
  }
}