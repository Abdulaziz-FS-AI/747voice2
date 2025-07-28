import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define route categories
  const protectedPaths = ['/dashboard', '/assistants', '/calls', '/leads', '/settings', '/team'];
  const authPaths = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
  const publicPaths = ['/', '/features', '/contact'];
  const pricingPaths = ['/pricing'];

  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  const isPricingPath = pricingPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect logic for unauthenticated users
  if (!user && isProtectedPath) {
    // Redirect unauthenticated users to pricing (payment required)
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  // Handle authenticated users
  if (user) {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If no profile, redirect to onboarding
      if (!profile) {
        if (request.nextUrl.pathname !== '/auth/onboarding') {
          return NextResponse.redirect(new URL('/auth/onboarding', request.url));
        }
        return response;
      }

      // For premium features, check subscription status
      const isPremium = profile.is_premium && profile.subscription_status === 'active';

      // Redirect authenticated users away from auth/pricing pages (except success/signout)
      if ((isAuthPath || isPricingPath) && 
          request.nextUrl.pathname !== '/auth/success' && 
          request.nextUrl.pathname !== '/auth/signout') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Check onboarding completion for protected paths
      if (isProtectedPath && 
          request.nextUrl.pathname !== '/auth/onboarding' && 
          !profile.onboarding_completed) {
        return NextResponse.redirect(new URL('/auth/onboarding', request.url));
      }

    } catch (error) {
      console.error('Middleware error:', error);
      // On error, allow the request to continue to avoid breaking the app
    }
  }

  // API route protection
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth check for public API routes
    const publicApiRoutes = ['/api/webhooks', '/api/health'];
    const isPublicApiRoute = publicApiRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );

    if (!isPublicApiRoute && !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};