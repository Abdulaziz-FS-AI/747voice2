import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { auditServiceRoleUsage } from '@/lib/security/service-role-guard';

// Client-side Supabase client
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Server-side Supabase client for Server Components
export async function createServerSupabaseClient() {
  console.log('🔗 [SUPABASE] Creating server client');
  
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();

    console.log('🔗 [SUPABASE] Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    });

    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value;
            console.log('🔗 [SUPABASE] Getting cookie:', name, value ? 'present' : 'missing');
            return value;
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log('🔗 [SUPABASE] Setting cookie:', name);
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              console.warn('🔗 [SUPABASE] Failed to set cookie:', error);
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: CookieOptions) {
            console.log('🔗 [SUPABASE] Removing cookie:', name);
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              console.warn('🔗 [SUPABASE] Failed to remove cookie:', error);
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    console.log('🔗 [SUPABASE] Server client created successfully');
    return client;
  } catch (error) {
    console.error('❌ [SUPABASE] Failed to create server client:', error);
    throw error;
  }
}

// Service role client for admin operations
export function createServiceRoleClient(operation?: string) {
  console.log('🔗 [SUPABASE] Creating service role client');
  
  // 🔒 SECURITY: Audit service role usage
  if (operation) {
    auditServiceRoleUsage(operation as any, {
      endpoint: 'createServiceRoleClient',
      riskLevel: 'medium'
    });
  } else {
    console.warn('🚨 Service role client created without operation context');
  }
  
  console.log('🔗 [SUPABASE] Service role environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
  });

  try {
    const client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('🔗 [SUPABASE] Service role client created successfully');
    return client;
  } catch (error) {
    console.error('❌ [SUPABASE] Failed to create service role client:', error);
    throw error;
  }
}

// Route handler client for API routes
export function createRouteHandlerClient(cookieStore: { get: (name: string) => { value: string } | undefined; set: (options: { name: string; value: string } & CookieOptions) => void }) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}