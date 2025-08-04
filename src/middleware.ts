// FIXED: Middleware that works with Next.js 15 and Ultimate Auth
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🔒 [MIDDLEWARE-FIXED] Request:', request.nextUrl.pathname);
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Enhanced Supabase client with better error handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)?.value;
            console.log('🔒 [MIDDLEWARE-FIXED] Getting cookie:', name, cookie ? 'present' : 'missing');
            return cookie;
          },
          set(name: string, value: string, options: any) {
            console.log('🔒 [MIDDLEWARE-FIXED] Setting cookie:', name);
            response.cookies.set({
              name,
              value,
              ...options,
              httpOnly: false, // Allow client-side access
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            })
          },
          remove(name: string, options: any) {
            console.log('🔒 [MIDDLEWARE-FIXED] Removing cookie:', name);
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0
            })
          },
        },
      }
    )

    // Enhanced auth check with timeout
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout in middleware')), 10000)
    );

    const { data: { user }, error } = await Promise.race([
      authPromise, 
      timeoutPromise
    ]) as any;

    console.log('🔒 [MIDDLEWARE-FIXED] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
      path: request.nextUrl.pathname
    });

    // Always allow auth callback
    if (request.nextUrl.pathname === '/auth/callback') {
      console.log('🔒 [MIDDLEWARE-FIXED] Allowing auth callback');
      return response
    }

    // Always allow API routes (let them handle their own auth)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      console.log('🔒 [MIDDLEWARE-FIXED] Allowing API route');
      return response
    }

    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user && !error) {
        // No user, but no error either - redirect to signin
        console.log('🔒 [MIDDLEWARE-FIXED] No user for dashboard - redirecting to signin');
        return NextResponse.redirect(new URL('/signin', request.url))
      }
      
      if (error) {
        // Auth error - might be session expired
        console.log('🔒 [MIDDLEWARE-FIXED] Auth error for dashboard:', error.message);
        
        // For auth errors, redirect to signin
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          return NextResponse.redirect(new URL('/signin?reason=session_expired', request.url))
        }
        
        // For other errors, allow through (ultimate auth will handle)
        console.log('🔒 [MIDDLEWARE-FIXED] Non-critical auth error, allowing through');
      }
      
      console.log('🔒 [MIDDLEWARE-FIXED] Dashboard access allowed');
    }

    // Redirect authenticated users away from auth pages
    if (user && (request.nextUrl.pathname === '/signin' || request.nextUrl.pathname === '/signup')) {
      console.log('🔒 [MIDDLEWARE-FIXED] Redirecting authenticated user to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('🔒 [MIDDLEWARE-FIXED] Request allowed');
    return response

  } catch (error) {
    console.error('❌ [MIDDLEWARE-FIXED] Critical error:', error);
    
    // For critical middleware errors, don't block the request
    // Let the ultimate auth system handle it
    console.log('🔒 [MIDDLEWARE-FIXED] Critical error - allowing request through');
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}