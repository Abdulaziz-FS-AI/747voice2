// FIXED: Supabase client that works with Next.js 15
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { cookies } from 'next/headers';

// Client-side Supabase client (unchanged)
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// FIXED: Server-side client with proper async cookie handling
export async function createServerSupabaseClientFixed() {
  console.log('🔗 [SUPABASE-FIXED] Creating server client with Next.js 15 compatibility');
  
  try {
    // Get cookies properly for Next.js 15
    const cookieStore = await cookies();

    console.log('🔗 [SUPABASE-FIXED] Environment check:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    });

    // Create server client with fixed cookie handling
    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = cookieStore.get(name);
            const value = cookie?.value;
            console.log('🔗 [SUPABASE-FIXED] Getting cookie:', name, value ? 'present' : 'missing');
            return value;
          },
          set(name: string, value: string, options: any) {
            console.log('🔗 [SUPABASE-FIXED] Setting cookie:', name);
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              console.warn('🔗 [SUPABASE-FIXED] Cookie set failed (expected in Server Component):', error);
            }
          },
          remove(name: string, options: any) {
            console.log('🔗 [SUPABASE-FIXED] Removing cookie:', name);
            try {
              cookieStore.delete(name);
            } catch (error) {
              console.warn('🔗 [SUPABASE-FIXED] Cookie remove failed (expected in Server Component):', error);
            }
          },
        },
      }
    );

    console.log('🔗 [SUPABASE-FIXED] Server client created successfully');
    return client;

  } catch (error) {
    console.error('❌ [SUPABASE-FIXED] Failed to create server client:', error);
    
    // Fallback: create simple client without cookie management
    console.log('🔗 [SUPABASE-FIXED] Using fallback client without cookies');
    
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

// Service role client (unchanged)
export function createServiceRoleClient(operation?: string) {
  console.log('🔗 [SUPABASE-FIXED] Creating service role client');
  
  if (operation) {
    console.log('🔗 [SUPABASE-FIXED] Operation:', operation);
  }
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}