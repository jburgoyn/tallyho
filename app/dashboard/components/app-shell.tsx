'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { BRAND, BrandLockup } from '@/app/components/brand';

// The app frame: a white top bar, a left sidebar and a light canvas. Shared by the dashboard, its
// loading skeleton and its error page.

function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-pp-border bg-white px-6">
      <Link href="/" aria-label={`${BRAND.name} home`} className="rounded focus-visible:outline-2 focus-visible:outline-pp-blue">
        <BrandLockup />
      </Link>
      <span className="hidden text-xs text-pp-muted md:inline">Built on PayPal REST APIs and AG Studio</span>
      <div className="ml-auto flex items-center gap-4 text-sm">
        <Link href="/#how-it-works" className="font-semibold text-pp-blue hover:underline">
          How it works
        </Link>
        <span className="flex items-center gap-2 text-pp-navy" title="Signed in to the PayPal sandbox account in .env.local">
          <span className="flex size-9 items-center justify-center rounded-full bg-pp-navy text-xs font-semibold text-white">
            PS
          </span>
          <span className="hidden font-semibold sm:inline">PayPal sandbox</span>
        </span>
      </div>
    </header>
  );
}

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col bg-pp-canvas font-paypal text-pp-ink">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-64 shrink-0 flex-col border-r border-pp-border bg-white" aria-label="Reports">
          {sidebar}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
