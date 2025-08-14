-- Sample data for testing the PIN-based system
-- Remove this file in production

-- Insert sample clients
INSERT INTO public.clients (pin, company_name, contact_email, notes) VALUES
('123456', 'Acme Corporation', 'admin@acme.com', 'Test client for development'),
('789012', 'Tech Solutions Inc', 'contact@techsolutions.com', 'Second test client'),
('456789', 'Global Enterprises', 'info@globalent.com', 'Third test client');

-- Get client IDs for reference
DO $$
DECLARE
  acme_id uuid;
  tech_id uuid;
  global_id uuid;
BEGIN
  SELECT id INTO acme_id FROM public.clients WHERE pin = '123456';
  SELECT id INTO tech_id FROM public.clients WHERE pin = '789012';
  SELECT id INTO global_id FROM public.clients WHERE pin = '456789';
  
  -- Insert sample assistants for Acme Corporation
  INSERT INTO public.client_assistants (
    client_id, 
    vapi_assistant_id, 
    display_name, 
    first_message, 
    voice, 
    model, 
    eval_method, 
    max_call_duration,
    system_prompt,
    questions
  ) VALUES
  (
    acme_id,
    'vapi_acme_sales_001',
    'Acme Sales Assistant',
    'Hello! Thank you for calling Acme Corporation. How can I help you today?',
    'jennifer',
    'gpt-4',
    'conversation_score',
    600,
    'You are a professional sales assistant for Acme Corporation. Be helpful and professional.',
    '[{"question": "What product are you interested in?", "type": "string", "required": true}]'::jsonb
  ),
  (
    acme_id,
    'vapi_acme_support_001',
    'Acme Support Assistant',
    'Hi! Welcome to Acme support. I''m here to help resolve any issues you might have.',
    'ryan',
    'gpt-3.5-turbo',
    'problem_solved',
    900,
    'You are a technical support assistant for Acme Corporation. Help customers with their issues.',
    '[{"question": "What issue are you experiencing?", "type": "string", "required": true}]'::jsonb
  );
  
  -- Insert sample assistants for Tech Solutions
  INSERT INTO public.client_assistants (
    client_id, 
    vapi_assistant_id, 
    display_name, 
    first_message, 
    voice, 
    model, 
    eval_method, 
    max_call_duration,
    system_prompt,
    questions
  ) VALUES
  (
    tech_id,
    'vapi_tech_lead_001',
    'Tech Lead Qualifier',
    'Thank you for calling Tech Solutions. Let me help qualify your technology needs.',
    'mark',
    'gpt-4',
    'lead_quality_score',
    450,
    'You are a lead qualification assistant for Tech Solutions Inc.',
    '[{"question": "What technology challenge are you facing?", "type": "string", "required": true}]'::jsonb
  );
  
  -- Insert sample phone numbers
  INSERT INTO public.client_phone_numbers (
    client_id,
    vapi_phone_id,
    phone_number,
    friendly_name,
    assigned_assistant_id
  ) VALUES
  (
    acme_id,
    'vapi_phone_acme_001',
    '+1-555-0101',
    'Acme Main Line',
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_sales_001')
  ),
  (
    acme_id,
    'vapi_phone_acme_002',
    '+1-555-0102',
    'Acme Support Line',
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_support_001')
  ),
  (
    tech_id,
    'vapi_phone_tech_001',
    '+1-555-0201',
    'Tech Solutions Intake',
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_tech_lead_001')
  );
  
  -- Insert sample call logs
  INSERT INTO public.call_logs (
    client_id,
    assistant_id,
    vapi_call_id,
    duration_seconds,
    cost,
    caller_number,
    started_at,
    ended_at,
    transcript,
    success_evaluation,
    summary,
    status
  ) VALUES
  (
    acme_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_sales_001'),
    'call_001',
    180,
    2.50,
    '+1-555-9001',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours' + INTERVAL '180 seconds',
    'Customer inquired about our premium services...',
    'Successful - High interest',
    'Qualified lead for premium services',
    'completed'
  ),
  (
    acme_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_sales_001'),
    'call_002',
    95,
    1.30,
    '+1-555-9002',
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '4 hours' + INTERVAL '95 seconds',
    'Brief inquiry about pricing...',
    'Successful - Medium interest',
    'Price inquiry, follow-up needed',
    'completed'
  ),
  (
    acme_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_support_001'),
    'call_003',
    320,
    4.20,
    '+1-555-9003',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours' + INTERVAL '320 seconds',
    'Customer had technical issues with login...',
    'Successful - Issue resolved',
    'Login issue resolved successfully',
    'completed'
  ),
  (
    tech_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_tech_lead_001'),
    'call_004',
    240,
    3.10,
    '+1-555-9004',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '240 seconds',
    'Startup looking for cloud migration help...',
    'Successful - Qualified lead',
    'High-value cloud migration prospect',
    'completed'
  );
  
  -- Process analytics for the sample calls
  PERFORM public.process_call_analytics(
    acme_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_sales_001'),
    CURRENT_DATE,
    275, -- average of 180 and 95
    375, -- total cost in cents
    true
  );
  
  PERFORM public.process_call_analytics(
    acme_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_acme_support_001'),
    CURRENT_DATE,
    320,
    420,
    true
  );
  
  PERFORM public.process_call_analytics(
    tech_id,
    (SELECT id FROM public.client_assistants WHERE vapi_assistant_id = 'vapi_tech_lead_001'),
    CURRENT_DATE - INTERVAL '1 day',
    240,
    310,
    true
  );
  
END $$;