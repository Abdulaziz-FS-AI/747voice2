-- Add template-related fields to assistants table
-- This migration adds fields needed for template integration

-- Add template_id column (already exists from 005_templates_system.sql)
-- ALTER TABLE assistants ADD COLUMN template_id UUID REFERENCES assistant_templates(id);

-- Add agent_name column (already exists from 006_prompt_templates.sql)
-- ALTER TABLE assistants ADD COLUMN agent_name VARCHAR(255);

-- Add tone column (already exists from 006_prompt_templates.sql)
-- ALTER TABLE assistants ADD COLUMN tone VARCHAR(50) DEFAULT 'professional';

-- Add generated_system_prompt column (already exists from 006_prompt_templates.sql)
-- ALTER TABLE assistants ADD COLUMN generated_system_prompt TEXT;

-- The above columns should already exist from previous migrations
-- This file is just for documentation purposes