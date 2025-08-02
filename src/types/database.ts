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
          subscription_type: 'free' | 'pro'
          subscription_status: 'active' | 'cancelled' | 'past_due' | 'inactive'
          current_usage_minutes: number
          max_minutes_monthly: number
          max_assistants: number
          billing_cycle_start: string
          billing_cycle_end: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          paypal_customer_id: string | null
          paypal_subscription_id: string | null
          paypal_payer_id: string | null
          payment_method_type: 'none' | 'paypal' | 'card'
          onboarding_completed: boolean
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
          subscription_type?: 'free' | 'pro'
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'inactive'
          current_usage_minutes?: number
          max_minutes_monthly?: number
          max_assistants?: number
          billing_cycle_start?: string
          billing_cycle_end?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          paypal_customer_id?: string | null
          paypal_subscription_id?: string | null
          paypal_payer_id?: string | null
          payment_method_type?: 'none' | 'paypal' | 'card'
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
          subscription_type?: 'free' | 'pro'
          subscription_status?: 'active' | 'cancelled' | 'past_due' | 'inactive'
          current_usage_minutes?: number
          max_minutes_monthly?: number
          max_assistants?: number
          billing_cycle_start?: string
          billing_cycle_end?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          paypal_customer_id?: string | null
          paypal_subscription_id?: string | null
          paypal_payer_id?: string | null
          payment_method_type?: 'none' | 'paypal' | 'card'
          onboarding_completed?: boolean
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
      subscription_events: {
        Row: {
          id: string
          user_id: string
          event_type: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'usage_limit_exceeded' | 'monthly_reset' | 'usage_warning' | 'payment_method_updated' | 'subscription_paused' | 'subscription_resumed' | 'refund_processed'
          from_plan: string | null
          to_plan: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'usage_limit_exceeded' | 'monthly_reset' | 'usage_warning' | 'payment_method_updated' | 'subscription_paused' | 'subscription_resumed' | 'refund_processed'
          from_plan?: string | null
          to_plan?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'payment_failed' | 'usage_limit_exceeded' | 'monthly_reset' | 'usage_warning' | 'payment_method_updated' | 'subscription_paused' | 'subscription_resumed' | 'refund_processed'
          from_plan?: string | null
          to_plan?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      vapi_sync_queue: {
        Row: {
          id: string
          assistant_id: string
          vapi_assistant_id: string
          action: 'disable' | 'enable' | 'delete' | 'update'
          reason: string
          priority: number
          retry_count: number
          error: string | null
          processed_at: string | null
          last_retry_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          assistant_id: string
          vapi_assistant_id: string
          action: 'disable' | 'enable' | 'delete' | 'update'
          reason: string
          priority?: number
          retry_count?: number
          error?: string | null
          processed_at?: string | null
          last_retry_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          assistant_id?: string
          vapi_assistant_id?: string
          action?: 'disable' | 'enable' | 'delete' | 'update'
          reason?: string
          priority?: number
          retry_count?: number
          error?: string | null
          processed_at?: string | null
          last_retry_at?: string | null
          created_at?: string
        }
      }
      payment_history: {
        Row: {
          id: string
          user_id: string
          transaction_id: string
          payment_provider: 'paypal' | 'stripe'
          amount: number
          currency: string
          status: 'completed' | 'pending' | 'failed' | 'refunded'
          payment_method: string | null
          description: string | null
          invoice_number: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id: string
          payment_provider: 'paypal' | 'stripe'
          amount: number
          currency?: string
          status: 'completed' | 'pending' | 'failed' | 'refunded'
          payment_method?: string | null
          description?: string | null
          invoice_number?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string
          payment_provider?: 'paypal' | 'stripe'
          amount?: number
          currency?: string
          status?: 'completed' | 'pending' | 'failed' | 'refunded'
          payment_method?: string | null
          description?: string | null
          invoice_number?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          invoice_number: string
          transaction_id: string | null
          amount: number
          tax: number
          total: number
          currency: string
          status: 'paid' | 'pending' | 'void'
          due_date: string | null
          paid_date: string | null
          pdf_url: string | null
          line_items: Json
          billing_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invoice_number: string
          transaction_id?: string | null
          amount: number
          tax?: number
          total: number
          currency?: string
          status: 'paid' | 'pending' | 'void'
          due_date?: string | null
          paid_date?: string | null
          pdf_url?: string | null
          line_items?: Json
          billing_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invoice_number?: string
          transaction_id?: string | null
          amount?: number
          tax?: number
          total?: number
          currency?: string
          status?: 'paid' | 'pending' | 'void'
          due_date?: string | null
          paid_date?: string | null
          pdf_url?: string | null
          line_items?: Json
          billing_details?: Json | null
          created_at?: string
        }
      }
      paypal_webhook_events: {
        Row: {
          id: string
          event_type: string
          resource_type: string | null
          resource_id: string | null
          summary: string | null
          processed: boolean
          raw_data: Json
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id: string
          event_type: string
          resource_type?: string | null
          resource_id?: string | null
          summary?: string | null
          processed?: boolean
          raw_data: Json
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          resource_type?: string | null
          resource_id?: string | null
          summary?: string | null
          processed?: boolean
          raw_data?: Json
          created_at?: string
          processed_at?: string | null
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