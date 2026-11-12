// The product's name and mark, in one place: the top bar, the landing page and page titles all
// read from here, so renaming the product is a change to this file.

import type { SVGProps } from 'react';

export const BRAND = {
  name: 'Tallyho',
  tagline: 'The cash-flow agent that chases what you are owed',
  description:
    'An AI agent that finds money stuck in your PayPal account, drafts the follow-ups, and waits for your approval before anything is sent.',
} as const;

/** The mark: a ledger line ticked off. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <rect width="32" height="32" rx="8" fill="var(--pp-blue)" />
      <path d="M8 21.5h16" stroke="#fff" strokeOpacity=".45" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m9.5 14.2 4.4 4.3 8.6-9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className="size-8 shrink-0" />
      <span className="text-xl font-semibold tracking-tight text-pp-navy">{BRAND.name}</span>
    </span>
  );
}
