import { GATE_COOKIE, gateToken, sameString } from '@/lib/demo-gate';

// Signs a visitor in to the hosted demo by setting the cookie proxy.ts looks for. The sign-in screen
// offers one-click guest entry, so judges need no credentials; the password still works too. The
// gate's job is to keep crawlers and blind API calls away from the model key and the PayPal sandbox.

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) return Response.json({ ok: true });

  const body = (await request.json().catch(() => null)) as { password?: unknown; guest?: unknown } | null;
  const given = typeof body?.password === 'string' ? body.password : '';
  if (body?.guest !== true && (!given || !sameString(given, expected))) {
    return Response.json({ error: { message: 'That password is not right.' } }, { status: 401 });
  }

  const cookie = `${GATE_COOKIE}=${await gateToken(expected)}; Path=/; Max-Age=${WEEK_SECONDS}; HttpOnly; SameSite=Lax; Secure`;
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
}
