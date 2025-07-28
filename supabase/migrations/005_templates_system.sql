-- Templates System for Voice Matrix
-- This migration adds assistant templates with structured questions

-- =============================================
-- TEMPLATE TYPES
-- =============================================

-- Field type enum for structured data
CREATE TYPE field_type_enum AS ENUM ('string', 'number', 'boolean');

-- =============================================
-- TEMPLATE TABLES
-- =============================================

-- Assistant templates (predefined templates users can customize)
CREATE TABLE assistant_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100) NOT NULL DEFAULT 'real_estate',
    description TEXT,
    system_prompt TEXT NOT NULL,
    first_message TEXT NOT NULL,
    personality personality_type DEFAULT 'professional',
    suggested_voice_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template questions for Vapi structured data collection
CREATE TABLE template_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES assistant_templates(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_description TEXT,
    structured_field_name VARCHAR(100) NOT NULL,
    field_type field_type_enum NOT NULL,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add template reference to assistants (users create from templates)
ALTER TABLE assistants ADD COLUMN template_id UUID REFERENCES assistant_templates(id);

-- User-created questions for their specific assistants
CREATE TABLE assistant_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    answer_description TEXT,
    structured_field_name VARCHAR(100) NOT NULL,
    field_type field_type_enum NOT NULL,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store structured data collected from calls
CREATE TABLE call_structured_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    field_type field_type_enum NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at trigger for templates
CREATE TRIGGER update_assistant_templates_updated_at 
    BEFORE UPDATE ON assistant_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SINGLE REAL ESTATE TEMPLATE
-- =============================================

-- Insert the one real estate template
INSERT INTO assistant_templates (
    id,
    name,
    industry,
    description,
    system_prompt,
    first_message,
    personality,
    suggested_voice_id
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Real Estate Lead Qualifier',
    'real_estate',
    'Professional real estate assistant that qualifies potential buyers and sellers, collects contact information, and schedules appointments.',
    'You are Sarah, a professional real estate assistant. Your goal is to help potential clients with their real estate needs and qualify leads. Be helpful, knowledgeable, and professional. Always try to gather the required information naturally during conversation. Ask questions one at a time and keep the conversation flowing naturally.',
    'Hello! Thank you for calling. This is Sarah, your real estate assistant. I''m here to help you with all your real estate needs. How can I assist you today?',
    'professional',
    'voice_professional_female_en'
);

-- Template questions for structured data collection
INSERT INTO template_questions (
    template_id,
    question_text,
    answer_description,
    structured_field_name,
    field_type,
    is_required,
    display_order
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'What is your full name?',
    'Get the caller''s complete name for follow-up contact',
    'full_name',
    'string',
    true,
    1
),
(
    '00000000-0000-0000-0000-000000000001',
    'What is the best phone number to reach you?',
    'Primary contact number for scheduling and follow-up',
    'phone_number',
    'string',
    true,
    2
),
(
    '00000000-0000-0000-0000-000000000001',
    'What is your email address?',
    'Email for sending property listings and documents',
    'email_address',
    'string',
    true,
    3
),
(
    '00000000-0000-0000-0000-000000000001',
    'Are you looking to buy or sell a property?',
    'Determine if they are a buyer or seller lead',
    'lead_type',
    'string',
    true,
    4
),
(
    '00000000-0000-0000-0000-000000000001',
    'What is your budget range?',
    'Maximum budget they are comfortable with',
    'budget_range',
    'string',
    false,
    5
),
(
    '00000000-0000-0000-0000-000000000001',
    'What areas are you interested in?',
    'Preferred neighborhoods or cities',
    'preferred_areas',
    'string',
    false,
    6
),
(
    '00000000-0000-0000-0000-000000000001',
    'Are you working with a real estate agent currently?',
    'Find out if they already have representation',
    'has_agent',
    'boolean',
    false,
    7
),
(
    '00000000-0000-0000-0000-000000000001',
    'When are you looking to make a move?',
    'Timeline for buying or selling',
    'timeline',
    'string',
    false,
    8
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_assistant_templates_industry ON assistant_templates(industry);
CREATE INDEX idx_template_questions_template_id ON template_questions(template_id);
CREATE INDEX idx_template_questions_order ON template_questions(template_id, display_order);
CREATE INDEX idx_assistant_questions_assistant_id ON assistant_questions(assistant_id);
CREATE INDEX idx_assistant_questions_order ON assistant_questions(assistant_id, display_order);
CREATE INDEX idx_call_structured_data_call_id ON call_structured_data(call_id);
CREATE INDEX idx_assistants_template_id ON assistants(template_id);

-- =============================================
-- PERMISSIONS
-- =============================================

-- Enable RLS on new tables
ALTER TABLE assistant_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_structured_data ENABLE ROW LEVEL SECURITY;

-- Templates are public (all users can see and use them)
CREATE POLICY "All users can view templates" ON assistant_templates
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All users can view template questions" ON template_questions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only team members can view their call structured data
CREATE POLICY "Team members can view call structured data" ON call_structured_data
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM calls 
            WHERE team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid()
            ) OR user_id = auth.uid()
        )
    );

-- Users can manage their assistant questions
CREATE POLICY "Users can manage assistant questions" ON assistant_questions
    FOR ALL USING (
        assistant_id IN (
            SELECT id FROM assistants 
            WHERE user_id = auth.uid() OR team_id IN (
                SELECT team_id FROM profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'agent')
            )
        )
    );

-- System can insert structured data
CREATE POLICY "System can create call structured data" ON call_structured_data
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);