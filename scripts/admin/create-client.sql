-- Create New Client Template
-- Replace the placeholder values below with actual client information

-- Step 1: Create the client
INSERT INTO clients (
  pin,               -- 6-8 digit unique PIN
  company_name,      -- Company or client name
  contact_email,     -- Email for PIN change verification
  notes             -- Optional notes
) VALUES (
  '123456',          -- REPLACE: Generate unique PIN
  'Acme Corporation', -- REPLACE: Client company name
  'admin@acme.com',  -- REPLACE: Client contact email
  'Client setup on ' || CURRENT_DATE -- Optional: Setup notes
);

-- Step 2: Get the client ID (run this to get the ID for next steps)
SELECT 
  id,
  pin,
  company_name,
  contact_email,
  created_at
FROM clients 
WHERE company_name = 'Acme Corporation' -- REPLACE: Use actual company name
ORDER BY created_at DESC 
LIMIT 1;

-- Notes:
-- 1. PIN must be unique across all clients
-- 2. Email will be used for PIN change verification
-- 3. Save the client ID for assigning assistants and phone numbers
-- 4. Share the PIN securely with the client (not via email)