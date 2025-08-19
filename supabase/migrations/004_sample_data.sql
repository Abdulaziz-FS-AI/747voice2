-- Clean test accounts for development
-- Accounts start empty - no mock assistants, phone numbers, or call logs

-- Insert clean test client accounts only
INSERT INTO public.clients (pin, company_name, contact_email, notes) VALUES
('123456', 'Acme Corporation', 'admin@acme.com', 'Test client for development'),
('789012', 'Tech Solutions Inc', 'contact@techsolutions.com', 'Second test client'),
('456789', 'Global Enterprises', 'info@globalent.com', 'Third test client');