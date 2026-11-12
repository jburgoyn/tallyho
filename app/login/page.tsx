import type { Metadata } from 'next';
import { BRAND, BrandLockup } from '../components/brand';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

// The hosted demo's sign-in screen (see proxy.ts). `next` is where the visitor was heading.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only ever return to a path on this site.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  return (
    <main className="grid min-h-dvh bg-pp-canvas font-paypal text-pp-ink lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-pp-navy via-pp-blue-dark to-pp-blue p-12 text-white lg:flex">
        <span className="inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 text-base">✓</span>
          {BRAND.name}
        </span>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-[1.1] tracking-tight">
            Stop chasing invoices. Approve the chase instead.
          </h1>
          <p className="mt-4 max-w-md text-lg text-white/80">{BRAND.description}</p>
        </div>
        <ul className="grid max-w-md gap-2 text-sm text-white/80">
          <li>• Reads live PayPal sandbox invoices</li>
          <li>• Drafts every reminder, in a tone that fits how late it is</li>
          <li>• Nothing reaches PayPal until you approve it</li>
        </ul>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <BrandLockup />
          </div>
          <h2 className="mt-8 text-2xl font-semibold text-pp-navy lg:mt-0">Welcome to the {BRAND.name} demo</h2>
          <p className="mt-2 text-pp-muted">
            You are about to use a live demo connected to a PayPal sandbox account. Nothing here moves real money,
            and no sign-up is needed.
          </p>
          <LoginForm destination={destination} />
          <p className="mt-6 text-xs text-pp-muted">Built on PayPal REST APIs and AG Studio for the PayPal AI Hackathon.</p>
        </div>
      </section>
    </main>
  );
}
