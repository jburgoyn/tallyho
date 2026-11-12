// The hosted demo's access gate, shared by proxy.ts and the sign-in route. When DEMO_PASSWORD is
// set, visitors sign in once on /login and carry a cookie; the cookie holds a hash of the password,
// never the password itself.

export const GATE_COOKIE = 'tallyho_demo';

/** The cookie value that proves the visitor knew `password`. */
export async function gateToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`tallyho:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compares every character whatever the input, so the time taken does not reveal a partial match.
export function sameString(a: string, b: string) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return difference === 0;
}
