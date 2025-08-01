# Voice Matrix Database Schema

## Overview
This directory contains the unified database schema for Voice Matrix, replacing all previous scattered migration files.

## Migration Files

### 000_unified_schema.sql
Complete database schema including:
- All tables with proper relationships
- Indexes for performance optimization
- Triggers for automated timestamps
- Auto-profile creation on user signup

### 001_rls_policies.sql
Row Level Security (RLS) policies ensuring:
- Complete user data isolation
- Secure multi-tenant architecture
- Proper access controls for all tables

### 002_seed_data.sql
Initial seed data including:
- Real estate assistant templates
- Default configuration values

## Tables

### Core Tables
- **profiles** - User profiles (extends auth.users)
- **templates** - Assistant templates for reuse
- **user_assistants** - User's AI assistants
- **structured_questions** - Dynamic form questions per assistant

### Communication Tables
- **user_phone_numbers** - Phone numbers assigned to assistants
- **call_logs** - Individual call records
- **call_analytics** - Aggregated call metrics

### System Tables
- **rate_limits** - API rate limiting

## Security Features
- Row Level Security (RLS) on all tables
- User data completely isolated by user_id
- Foreign key constraints with proper CASCADE behavior
- Secure auto-profile creation

## Cleaned Up Files
- **Removed**: 30+ outdated migration files that were causing conflicts
- **Removed**: Outdated `sample-template.sql` file 
- **Updated**: Database TypeScript types to match unified schema
- **Replaced**: Old `database.ts` and `database-simplified.ts` with accurate unified types

## Usage
1. Run migrations in order: 000, 001, 002
2. Verify all tables and policies are created
3. Test with sample data to ensure proper isolation

## Performance
- Optimized indexes on frequently queried columns
- Proper foreign key relationships
- Efficient RLS policies using EXISTS clauses