import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Skip static assets and public routes
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/debug',
  '/dev',
  '/test',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/api/auth'
];

const STATIC_PATHS = [
  '/_next',
  '/assets',
  '/images',
  '/icons'
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets and Next.js internals
  if (STATIC_PATHS.some(path => pathname.startsWith(path)) || 
      pathname.includes('.') || // Skip files with extensions
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/manifest.json') {
    return NextResponse.next();
  }

  // Create response object for cookie management
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Create Supabase client with explicit cookie management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  try {
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[middleware.auth] Session error:', error);
    }

    // Handle login page with existing session
    if (pathname === '/login' && session) {
      const redirectTo = req.nextUrl.searchParams.get('redirectTo');
      const safeRedirectTo = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
      
      console.log('[middleware.auth] Authenticated user on login, redirecting to:', safeRedirectTo);
      
      const url = req.nextUrl.clone();
      url.pathname = safeRedirectTo;
      url.searchParams.delete('redirectTo');
      return NextResponse.redirect(url);
    }

    // Handle signup page with existing session
    if (pathname === '/signup' && session) {
      console.log('[middleware.auth] Authenticated user on signup, redirecting to dashboard');
      
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // Allow debug routes without authentication
    if (pathname.startsWith('/debug') || pathname.startsWith('/dev') || pathname.startsWith('/test')) {
      return res;
    }

    // Protect dashboard and account routes
    if ((pathname.startsWith('/dashboard') || pathname.startsWith('/account')) && !session) {
      console.log('[middleware.auth] Unauthenticated user accessing protected route:', pathname);
      
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    // Protect API routes (except auth endpoints)
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/') && !session) {
      console.log('[middleware.auth] Unauthenticated user accessing protected API:', pathname);
      
      // Return 401 for API routes instead of redirecting
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Allow all other requests to proceed
    return res;

  } catch (error) {
    console.error('[middleware.auth] Unexpected error:', error);
    
    // On error, allow the request to proceed (fail open for safety)
    return res;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
