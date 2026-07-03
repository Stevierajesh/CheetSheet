import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth'];

/**
 * Runs before every matched request (Next.js 16 replacement for middleware):
 * refreshes the Supabase session cookie and gates routes.
 * - Unauthenticated users are redirected to /login.
 * - /admin requires the app_metadata role claim to be 'admin'.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() verifies the JWT (never trust getSession() for authorization)
  // and refreshes the session cookie if expired.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    // Email-confirmation links land on /?code=...; the browser client
    // exchanges the code for a session on page load, so let it through.
    request.nextUrl.searchParams.has('code');

  if (!claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (claims && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/admin')) {
    const role = (claims?.app_metadata as { role?: string } | undefined)?.role;
    if (role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
