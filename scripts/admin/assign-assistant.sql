-- Assign VAPI Assistant to Client Template
-- Replace the placeholder values below with actual information

-- First, verify the client exists
SELECT id, company_name FROM clients WHERE company_name = 'Acme Corporation';
-- Copy the client ID from above result

-- Step 1: Assign the assistant
INSERT INTO client_assistants (
  client_id,                    -- Client UUID from above query
  vapi_assistant_id,            -- VAPI assistant ID from VAPI dashboard
  display_name,                 -- Name shown to client
  first_message,                -- Optional: Custom first message
  voice,                        -- Optional: Voice setting
  model,                        -- Optional: AI model
  eval_method,                  -- Optional: Evaluation method
  max_call_duration,            -- Optional: Max call time in seconds
  system_prompt,                -- Optional: System prompt (read-only for client)
  questions                     -- Optional: Structured questions (read-only)
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- REPLACE: Client ID from step above
  'vapi_assistant_123',                    -- REPLACE: VAPI assistant ID
  'Customer Support Assistant',            -- REPLACE: Display name
  'Hello! How can I help you today?',      -- REPLACE: First message
  'jennifer',                              -- REPLACE: Voice (jennifer, ryan, mark, etc.)
  'gpt-4',                                -- REPLACE: Model (gpt-4, gpt-3.5-turbo)
  'conversation_score',                    -- REPLACE: Evaluation method
  600,                                     -- REPLACE: Max duration (seconds)
  'You are a helpful customer support assistant.', -- REPLACE: System prompt
  '[{"question": "How can I help you?", "type": "string"}]'::jsonb -- REPLACE: Questions
);

-- Step 2: Verify the assignment
SELECT 
  ca.id,
  ca.vapi_assistant_id,
  ca.display_name,
  ca.assigned_at,
  c.company_name,
  c.pin
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
WHERE c.company_name = 'Acme Corporation' -- REPLACE: Use actual company name
  AND ca.is_active = true
ORDER BY ca.assigned_at DESC;

-- Notes:
-- 1. VAPI assistant must exist in VAPI dashboard first
-- 2. Client can edit: display_name, first_message, voice, model, eval_method, max_call_duration
-- 3. Client cannot edit: system_prompt, questions (admin-controlled)
-- 4. One assistant can be assigned to multiple clients
-- 5. Clients will see this assistant in their dashboard immediately