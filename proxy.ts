import { NextResponse, type NextRequest } from 'next/server';
import { GATE_COOKIE, gateToken, sameString } from '@/lib/demo-gate';

// Access gate for a hosted demo. The app's API routes spend the owner's model key and act on their
// PayPal sandbox, so a public deployment must not be open to everyone.
//
// Set DEMO_PASSWORD on the host and every page and API route needs a sign-in: visitors are sent to
// /login, and a correct password sets a cookie. Leave it unset (local development) and nothing is gated.

const OPEN_PATHS = new Set(['/login', '/api/login']);

export async function proxy(request: NextRequest) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (OPEN_PATHS.has(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && sameString(cookie, await gateToken(expected))) return NextResponse.next();

  // API calls get a plain 401; pages are sent to the sign-in screen and come back afterwards.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: { message: 'Sign in to the demo first.' } }, { status: 401 });
  }
  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own static assets, which hold nothing private.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
