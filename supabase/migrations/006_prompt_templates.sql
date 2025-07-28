-- Prompt Templates System for Voice Matrix
-- This migration adds system prompt templates with dynamic placeholders

-- =============================================
-- PROMPT TEMPLATES TABLE
-- =============================================

-- Store base prompt templates for different industries
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    industry VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_prompt TEXT NOT NULL,
    dynamic_slots JSONB NOT NULL DEFAULT '[]', -- Array of placeholder names
    default_values JSONB DEFAULT '{}', -- Default values for placeholders
    required_fields JSONB NOT NULL DEFAULT '[]', -- Array of required fields
    first_message_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- UPDATE ASSISTANTS TABLE
-- =============================================

-- Add prompt template related columns to assistants
ALTER TABLE assistants ADD COLUMN prompt_template_id UUID REFERENCES prompt_templates(id);
ALTER TABLE assistants ADD COLUMN agent_name VARCHAR(255);
ALTER TABLE assistants ADD COLUMN tone VARCHAR(50) DEFAULT 'professional';
ALTER TABLE assistants ADD COLUMN custom_instructions TEXT;
ALTER TABLE assistants ADD COLUMN generated_system_prompt TEXT;

-- =============================================
-- INSERT REAL ESTATE TEMPLATE
-- =============================================

INSERT INTO prompt_templates (
    id,
    industry,
    name,
    description,
    base_prompt,
    dynamic_slots,
    required_fields,
    first_message_template,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'real_estate',
    'Real Estate Agent Assistant',
    'Professional real estate assistant for lead qualification and property inquiries',
    'You are {AGENT_NAME}, a professional real estate assistant working for {COMPANY_NAME}. 

Your primary goals are to:
- Help potential clients with their real estate needs
- Qualify leads by gathering important information
- Provide helpful information about properties and the buying/selling process
- Schedule appointments when appropriate
- Maintain a {TONE} and helpful demeanor throughout the conversation

IMPORTANT CONVERSATION GUIDELINES:
- Always introduce yourself as {AGENT_NAME} from {COMPANY_NAME}
- Be {TONE} but not pushy
- Listen carefully to the caller''s needs
- Ask follow-up questions to understand their situation better
- If you don''t know specific details about properties or processes, offer to connect them with a human agent

{CUSTOM_INSTRUCTIONS}

{QUESTION_COLLECTION_INSTRUCTIONS}

CRITICAL RULES:
- Never make up property details or pricing
- Always be honest about what you can and cannot do
- If unsure, offer to have a human agent follow up
- Keep conversations natural and flowing
- Remember to use the collectLeadData function to save any information you gather',
    '["AGENT_NAME", "COMPANY_NAME", "TONE", "CUSTOM_INSTRUCTIONS", "QUESTION_COLLECTION_INSTRUCTIONS"]'::jsonb,
    '["AGENT_NAME", "COMPANY_NAME"]'::jsonb,
    'Hello! Thank you for calling {COMPANY_NAME}. This is {AGENT_NAME}, your AI assistant. I''m here to help you with all your real estate needs. How can I assist you today?',
    true
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_prompt_templates_industry ON prompt_templates(industry);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX idx_assistants_prompt_template ON assistants(prompt_template_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at trigger for templates
CREATE TRIGGER update_prompt_templates_updated_at 
    BEFORE UPDATE ON prompt_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PERMISSIONS
-- =============================================

-- Enable RLS on prompt templates
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active templates
CREATE POLICY "All users can view active templates" ON prompt_templates
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Only admins can manage templates (future feature)
CREATE POLICY "Admins can manage templates" ON prompt_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );