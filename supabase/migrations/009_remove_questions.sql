-- Remove structured questions system from database
-- This removes the questions field from client_assistants and related functionality

-- Remove questions column from client_assistants table
ALTER TABLE public.client_assistants DROP COLUMN IF EXISTS questions;

-- Drop structured_questions table if it exists (from analytics)
DROP TABLE IF EXISTS public.structured_questions CASCADE;

-- Remove any structured data that might reference questions
-- (keeping structured_data field in call_logs as it may contain other data)

-- Add comment to document the removal
COMMENT ON TABLE public.client_assistants IS 'Assistant configuration without structured questions system';