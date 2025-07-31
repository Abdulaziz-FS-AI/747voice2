// Environment variable validation
const requiredEnvVars = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPI_API_KEY',
  'VAPI_WEBHOOK_SECRET',
  'MAKE_WEBHOOK_URL',
  'MAKE_WEBHOOK_SECRET'
] as const;

// Optional environment variables
const optionalEnvVars = [
  'CRON_SECRET'
] as const;

type RequiredEnvVar = typeof requiredEnvVars[number];

export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file or Vercel environment settings.'
    );
  }
}

// Type-safe environment variable access
export const env = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  VAPI_API_KEY: process.env.VAPI_API_KEY!,
  VAPI_WEBHOOK_SECRET: process.env.VAPI_WEBHOOK_SECRET!,
  MAKE_WEBHOOK_URL: process.env.MAKE_WEBHOOK_URL!,
  MAKE_WEBHOOK_SECRET: process.env.MAKE_WEBHOOK_SECRET!,
} as const;

// Validate on module load in production
if (process.env.NODE_ENV === 'production') {
  validateEnv();
}