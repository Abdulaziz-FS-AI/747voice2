# Admin Scripts for PIN-Based Voice Matrix System

This directory contains scripts and SQL commands for administrators to manually manage clients, assistants, and phone numbers in the PIN-based system.

## Quick Start Guide

### 1. Create a New Client
```sql
-- Run this in Supabase SQL Editor
INSERT INTO clients (pin, company_name, contact_email, notes) 
VALUES ('123456', 'Acme Corporation', 'admin@acme.com', 'New client setup');
```

### 2. Get Client ID
```sql
-- Find the client ID after creation
SELECT id, company_name, pin FROM clients WHERE company_name = 'Acme Corporation';
```

### 3. Assign VAPI Assistant to Client
```sql
-- Replace CLIENT_ID and VAPI_ASSISTANT_ID with actual values
INSERT INTO client_assistants (
  client_id,
  vapi_assistant_id,
  display_name,
  first_message,
  voice,
  model,
  eval_method,
  max_call_duration
) VALUES (
  'CLIENT_ID_HERE',
  'VAPI_ASSISTANT_ID_HERE',
  'Customer Support Assistant',
  'Hello! How can I help you today?',
  'jennifer',
  'gpt-4',
  'conversation_score',
  600
);
```

### 4. Assign Phone Number to Client
```sql
-- Replace CLIENT_ID and VAPI_PHONE_ID with actual values
INSERT INTO client_phone_numbers (
  client_id,
  vapi_phone_id,
  phone_number,
  friendly_name,
  assigned_assistant_id
) VALUES (
  'CLIENT_ID_HERE',
  'VAPI_PHONE_ID_HERE',
  '+1-555-0123',
  'Main Support Line',
  (SELECT id FROM client_assistants WHERE vapi_assistant_id = 'VAPI_ASSISTANT_ID_HERE')
);
```

## Common Administrative Tasks

### View All Clients
```sql
SELECT 
  id,
  pin,
  company_name,
  contact_email,
  created_at,
  is_active
FROM clients 
ORDER BY created_at DESC;
```

### View Client's Assistants
```sql
SELECT 
  ca.id,
  ca.vapi_assistant_id,
  ca.display_name,
  ca.assigned_at,
  c.company_name
FROM client_assistants ca
JOIN clients c ON c.id = ca.client_id
WHERE c.company_name = 'CLIENT_COMPANY_NAME'
  AND ca.is_active = true;
```

### View Client's Phone Numbers
```sql
SELECT 
  cpn.phone_number,
  cpn.friendly_name,
  cpn.vapi_phone_id,
  ca.display_name as assistant_name,
  c.company_name
FROM client_phone_numbers cpn
JOIN clients c ON c.id = cpn.client_id
LEFT JOIN client_assistants ca ON ca.id = cpn.assigned_assistant_id
WHERE c.company_name = 'CLIENT_COMPANY_NAME'
  AND cpn.is_active = true;
```

### Deactivate Client
```sql
UPDATE clients 
SET is_active = false, updated_at = now()
WHERE company_name = 'CLIENT_COMPANY_NAME';
```

### Reset Client PIN
```sql
UPDATE clients 
SET pin = 'NEW_PIN_HERE', pin_changed_at = now()
WHERE company_name = 'CLIENT_COMPANY_NAME';
```

## Security Best Practices

1. **PIN Generation**: Use unique 6-8 digit PINs
2. **Email Verification**: Ensure contact_email is accurate for PIN changes
3. **VAPI ID Verification**: Double-check VAPI assistant and phone IDs before assignment
4. **Client Communications**: Securely share PINs with clients (not via email)

## Troubleshooting

### Client Can't Login
1. Check if client is active: `SELECT is_active FROM clients WHERE pin = 'PIN_HERE'`
2. Verify PIN format: Must be 6-8 digits
3. Check for active session conflicts

### Assistant Not Showing
1. Verify assignment: `SELECT * FROM client_assistants WHERE client_id = 'CLIENT_ID'`
2. Check if active: `is_active = true`
3. Verify VAPI assistant exists

### Phone Number Issues
1. Check assignment: `SELECT * FROM client_phone_numbers WHERE client_id = 'CLIENT_ID'`
2. Verify VAPI phone number exists
3. Check assistant assignment

## File Structure
- `create-client.sql` - Template for creating new clients
- `assign-assistant.sql` - Template for assigning assistants
- `assign-phone.sql` - Template for assigning phone numbers
- `maintenance.sql` - Common maintenance queries