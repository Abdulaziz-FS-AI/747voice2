import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🔒 [MIDDLEWARE] Request:', request.nextUrl.pathname);
  
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)?.value;
            console.log('🔒 [MIDDLEWARE] Getting cookie:', name, cookie ? 'present' : 'missing');
            return cookie;
          },
          set(name: string, value: string, options: CookieOptions) {
            console.log('🔒 [MIDDLEWARE] Setting cookie:', name);
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            console.log('🔒 [MIDDLEWARE] Removing cookie:', name);
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔒 [MIDDLEWARE] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message
    });

    // Allow auth callback route without authentication
    if (request.nextUrl.pathname === '/auth/callback') {
      console.log('🔒 [MIDDLEWARE] Allowing auth callback');
      return response
    }

    // Protect dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user) {
        console.log('🔒 [MIDDLEWARE] Redirecting to signin - no user');
        return NextResponse.redirect(new URL('/signin', request.url))
      }
      console.log('🔒 [MIDDLEWARE] User authenticated, allowing dashboard access');
    }

    // Redirect authenticated users away from auth pages
    if (user && (request.nextUrl.pathname === '/signin' || request.nextUrl.pathname === '/signup')) {
      console.log('🔒 [MIDDLEWARE] Redirecting authenticated user to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('🔒 [MIDDLEWARE] Request allowed');
    return response
  } catch (error) {
    console.error('❌ [MIDDLEWARE] Error:', error);
    // Allow request to continue on middleware error
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}