# Supabase Migration Guide - PIN-Based System

## Overview
This guide explains how to apply the database migrations for the PIN-based voice assistant management system.

## Migration Files

The migrations should be applied in the following order:

1. **001_init_pin_system.sql** - Creates base tables and indexes
2. **002_auth_functions.sql** - Creates authentication and session management functions  
3. **003_analytics_functions.sql** - Creates analytics and reporting functions
4. **004_rls_policies.sql** - Sets up Row Level Security policies
5. **005_additional_functions.sql** - Additional helper functions

## Prerequisites

- Supabase project with PostgreSQL 14+
- Service role key for database access
- SQL client or Supabase Dashboard SQL editor

## Step-by-Step Migration Process

### 1. Clean Database (If Needed)

If you have existing tables, backup your data first, then run:

```sql
-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.call_analytics CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.client_phone_numbers CASCADE;
DROP TABLE IF EXISTS public.client_assistants CASCADE;
DROP TABLE IF EXISTS public.client_sessions CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.authenticate_pin CASCADE;
DROP FUNCTION IF EXISTS public.validate_session CASCADE;
-- ... (drop other functions as needed)
```

### 2. Apply Migrations

Run each migration file in order through the Supabase Dashboard:

1. Go to SQL Editor in Supabase Dashboard
2. Copy and paste each migration file content
3. Execute the migration
4. Verify no errors occurred

### 3. Verify Migration Success

Run the test script to verify all components are working:

```sql
-- Run scripts/test-migrations.sql
-- This will create test data and verify all functions work correctly
```

### 4. Create Test Data (Optional)

For development/testing, create sample data:

```sql
-- Run scripts/admin/create-test-data.sql
-- This creates sample clients with PINs like 111111, 222222, etc.
```

## Database Schema Overview

### Core Tables

- **clients** - PIN-authenticated client accounts
- **client_assistants** - VAPI assistants assigned to clients
- **client_phone_numbers** - Phone numbers assigned to clients
- **call_logs** - Detailed call records
- **call_analytics** - Aggregated analytics data
- **client_sessions** - Active session tokens

### Key Functions

#### Authentication
- `authenticate_pin(pin, ip, user_agent)` - Authenticate with PIN
- `validate_session(token)` - Validate session token
- `logout_session(token)` - Invalidate session

#### Data Access
- `get_client_assistants(client_id)` - Get assigned assistants
- `get_client_phone_numbers(client_id)` - Get assigned phone numbers
- `update_assistant(...)` - Update assistant settings (limited fields)

#### Analytics
- `get_dashboard_analytics(client_id, days)` - Dashboard stats
- `get_recent_calls(client_id, limit)` - Recent call logs
- `get_client_usage(client_id, start_date, end_date)` - Usage summary

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Service role has full access
- Anonymous users can only access through stored functions

### PIN Authentication
- 6-8 digit PINs required
- Session tokens expire after 24 hours
- Sessions automatically extend on activity

### Limited Client Permissions
Clients can only edit these assistant fields:
- display_name
- first_message  
- voice
- model
- eval_method
- max_call_duration

## Testing Authentication Flow

1. **Create a test client:**
```sql
INSERT INTO public.clients (pin, company_name, contact_email)
VALUES ('123456', 'Test Company', 'test@example.com');
```

2. **Authenticate with PIN:**
```sql
SELECT * FROM public.authenticate_pin('123456', '127.0.0.1', 'Test Browser');
-- Returns: success, client_id, session_token, company_name
```

3. **Validate session:**
```sql
SELECT * FROM public.validate_session('your-session-token-here');
-- Returns: valid, client_id, company_name, expires_at
```

4. **Access client data:**
```sql
SELECT * FROM public.get_client_assistants('client-id-here');
```

## Common Issues and Solutions

### Issue: Permission Denied
**Solution:** Ensure you're using the service role key for migrations

### Issue: Function Already Exists
**Solution:** Drop the function first or use CREATE OR REPLACE

### Issue: RLS Policy Blocks Access
**Solution:** Verify you're accessing data through stored functions, not direct queries

### Issue: Session Token Invalid
**Solution:** Sessions expire after 24 hours. Re-authenticate with PIN.

## Environment Variables

Ensure these are set in your application:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Admin Operations

### Create New Client
```sql
-- Run scripts/admin/create-client.sql
INSERT INTO public.clients (pin, company_name, contact_email)
VALUES ('unique-pin', 'Company Name', 'email@example.com');
```

### Assign Assistant to Client
```sql
-- Run scripts/admin/assign-assistant.sql
INSERT INTO public.client_assistants (
  client_id, vapi_assistant_id, display_name, ...
) VALUES (...);
```

### Monitor Usage
```sql
SELECT * FROM public.get_client_usage('client-id', NULL, NULL);
```

## Rollback Process

If you need to rollback migrations:

1. Backup current data
2. Drop all created tables and functions
3. Restore from backup if needed

## Support

For issues or questions:
- Check the test scripts in `/scripts/` 
- Review function definitions in migration files
- Verify RLS policies are correctly applied

## Next Steps

After successful migration:

1. Test PIN authentication through the application
2. Verify clients can only access their assigned resources
3. Confirm analytics are tracking calls correctly
4. Set up webhook endpoints for VAPI integration