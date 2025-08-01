# Analytics Backend Issue

## Problem
General analytics (`/dashboard/analytics/page.tsx`) doesn't work - returns empty data, while assistant-specific analytics (`/dashboard/analytics/assistant/page.tsx`) works fine.

## Root Cause
The general analytics API endpoint uses wrong database table names and field mappings.

## Detailed Analysis

### ✅ Working: Assistant Analytics (`/api/analytics/assistant/[id]/route.ts`)
- Queries correct tables: `call_logs`, `user_assistants`
- Uses proper field mappings matching actual database schema
- Returns proper data

### ❌ Broken: General Analytics (`/api/analytics/overview/route.ts`)
- **Line 72**: Queries `calls` table (doesn't exist)
- **Should query**: `call_logs` table
- **Field mapping issues**:
  - Uses `duration` field (should be `duration_seconds`)
  - Uses `caller_number` (should be `caller_number` - this one is correct)
  - Uses `status` field (doesn't exist in `call_logs`)
  - Uses `started_at` for ordering (correct)

## Database Schema (Actual)
```sql
-- This is what exists:
CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY,
  assistant_id uuid REFERENCES user_assistants(id),
  duration_seconds integer DEFAULT 0,
  cost numeric,
  caller_number text,
  started_at timestamp with time zone,
  transcript text,
  structured_data jsonb,
  success_evaluation text,
  summary text
);

CREATE TABLE public.user_assistants (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  name text,
  vapi_assistant_id text UNIQUE,
  -- other fields...
);
```

## Fix Required
Update `/src/app/api/analytics/overview/route.ts`:

1. **Line 72**: Change `from('calls')` to `from('call_logs')`
2. **Line 95**: Change `call.duration` to `call.duration_seconds`  
3. **Line 96**: Change `call.duration` to `call.duration_seconds`
4. **Line 100**: Remove status-based success calculation (no status field in call_logs)
5. **Line 128**: Change `call.duration` to `call.duration_seconds`
6. **Line 150**: Change `call.duration` to `call.duration_seconds`

## Files Affected
- `/src/app/api/analytics/overview/route.ts` - Main fix needed
- `/src/app/dashboard/analytics/page.tsx` - Frontend (works fine)

## Status
- Issue identified: ✅
- Fix ready: ✅  
- Applied: ✅ (completed)

## Changes Applied
1. **Line 73**: Changed `from('calls')` to `from('call_logs')`
2. **Line 96**: Changed `call.duration` to `call.duration_seconds`
3. **Line 100-101**: Updated success rate calculation to use `success_evaluation` field instead of non-existent `status` field
4. **Line 107**: Updated assistant success calculation to use `success_evaluation`
5. **Line 122**: Updated recent activity success logic to use `success_evaluation`
6. **Line 128**: Changed `call.duration` to `call.duration_seconds` in recent activity
7. **Line 150**: Changed `call.duration` to `call.duration_seconds` in daily stats
8. **Line 86**: Updated error message to reference correct table name

## Success Criteria for `success_evaluation`
- `'successful'` - Call completed successfully
- `'qualified'` - Lead was qualified 
- Other values treated as unsuccessful

---
*Issue documented on: 2025-08-01*
*Issue resolved on: 2025-08-01*
*Location: Voice Matrix project analytics system*