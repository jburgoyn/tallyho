import { NextResponse, type NextRequest } from 'next/server';

// Access gate for a hosted demo. The app's API routes spend the owner's model key and act on their
// PayPal sandbox, so a public deployment must not be open to everyone.
//
// Set DEMO_PASSWORD on the host and every page and API route asks for HTTP Basic credentials: any
// username, and that password. Leave it unset (local development) and nothing is gated.

const REALM = 'Basic realm="Cash-flow agent demo", charset="UTF-8"';

// Compares every character whatever the input, so the time taken does not reveal a partial match.
function sameString(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return difference === 0;
}

function passwordFrom(header: string | null): string | undefined {
  if (!header?.startsWith('Basic ')) return undefined;
  try {
    const decoded = atob(header.slice(6));
    const colon = decoded.indexOf(':');
    return colon === -1 ? undefined : decoded.slice(colon + 1);
  } catch {
    return undefined;
  }
}

export function proxy(request: NextRequest) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) return NextResponse.next();

  const given = passwordFrom(request.headers.get('authorization'));
  if (given !== undefined && sameString(given, expected)) return NextResponse.next();

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': REALM },
  });
}

export const config = {
  // Everything except Next's own static assets, which hold nothing private.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
