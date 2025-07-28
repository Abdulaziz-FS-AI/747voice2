# Voice Matrix Setup Guide

This guide will help you set up the Voice Matrix project locally for development.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project
- Vapi account and API access

## Quick Start

### 1. Clone and Install Dependencies

```bash
cd voice-matrix
npm install
```

### 2. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env.local
```

2. Fill in your actual values in `.env.local`:

#### Supabase Configuration
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Create a new project or select existing one
- Go to Settings > API
- Copy your Project URL and anon key
- For the service role key, go to Settings > API > Service Role

#### Vapi Configuration
- Go to your [Vapi Dashboard](https://vapi.ai)
- Navigate to API Keys section
- Create or copy your API key
- Set up a webhook endpoint (covered in step 4)

### 3. Database Setup

#### Option A: Local Supabase (Recommended for Development)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase:
```bash
supabase start
```

3. Run migrations:
```bash
supabase db reset
```

4. Your local Supabase will be available at:
- API: http://localhost:54321
- Studio: http://localhost:54323
- Database: postgresql://postgres:postgres@localhost:54322/postgres

#### Option B: Remote Supabase

1. Go to your Supabase project
2. Go to SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`

### 4. Vapi Webhook Setup

1. In your Vapi dashboard, set up a webhook endpoint:
   - URL: `https://your-domain.com/api/webhooks/vapi` (or ngrok URL for local development)
   - Events: Select all call events
   - Copy the webhook secret to your `.env.local`

2. For local development, use ngrok:
```bash
npm install -g ngrok
ngrok http 3000
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Project Structure

```
voice-matrix/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   │   ├── supabase.ts     # Supabase client configurations
│   │   ├── auth.ts         # Authentication utilities
│   │   └── errors.ts       # Error handling
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── public/                 # Static assets
└── docs/                   # Documentation
```

## Key Features Implemented

### Authentication & Authorization
- Supabase Auth integration
- Row Level Security (RLS) policies
- Role-based permissions (admin, agent, viewer)
- Team-based access control

### Database Schema
- **Teams**: Organization management
- **Profiles**: User profiles with roles
- **Assistants**: AI voice assistant configurations
- **Calls**: Call records and analytics
- **Leads**: Lead management and scoring
- **Audit Logs**: Activity tracking

### API Architecture
- RESTful API routes in `/api/`
- Comprehensive error handling
- Input validation with Zod
- Webhook handling for Vapi events

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `VAPI_API_KEY` | Your Vapi API key | Yes |
| `VAPI_WEBHOOK_SECRET` | Vapi webhook secret | Yes |
| `NEXTAUTH_SECRET` | JWT secret for authentication | Yes |

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check

# Database commands (with Supabase CLI)
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
supabase db reset       # Reset and run all migrations
supabase db push        # Push local changes to remote
```

## Testing

### Local Testing with Vapi

1. Set up ngrok for webhook testing:
```bash
ngrok http 3000
```

2. Update your Vapi webhook URL to the ngrok URL
3. Create a test assistant in the app
4. Use Vapi's test phone number to make calls

### Authentication Testing

1. Sign up for a new account at `/auth/signup`
2. Check your email for confirmation (if email confirmation is enabled)
3. Complete onboarding process
4. Test role-based access controls

## Troubleshooting

### Common Issues

1. **Supabase Connection Issues**
   - Verify your environment variables
   - Check if Supabase project is active
   - Ensure RLS policies are applied

2. **Vapi Webhook Issues**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Review webhook logs in Vapi dashboard

3. **Authentication Issues**
   - Clear browser cookies/local storage
   - Check NEXTAUTH_SECRET is set
   - Verify Supabase Auth settings

### Database Issues

1. **Migration Errors**
   - Ensure migrations run in correct order
   - Check for missing extensions
   - Verify user permissions

2. **RLS Policy Issues**
   - Test policies with different user roles
   - Check team assignments
   - Review policy conditions

## Production Deployment

### Vercel Deployment (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure these are set in your production environment:
- All the variables from `.env.example`
- Set `NODE_ENV=production`
- Use production Supabase URLs
- Set secure webhook URLs

### Database Migration for Production

1. Run migrations on your production Supabase:
```bash
supabase db push --project-ref your-project-ref
```

2. Verify RLS policies are active
3. Test with production data

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the [project documentation](./COMPLETE_PROJECT_DOCUMENTATION.md)
3. Check Supabase and Vapi documentation
4. Create an issue in the project repository

## Next Steps

After setup is complete:
1. Configure your first AI assistant
2. Set up phone numbers in Vapi
3. Test call flows
4. Configure team settings
5. Set up monitoring and analytics