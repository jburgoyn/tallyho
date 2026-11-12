import Link from 'next/link';
import { BRAND, BrandLockup } from './components/brand';

// The landing page: what the product is, how it works, and the way into the dashboard. Static, so
// it loads without touching PayPal.

const STEPS = [
  {
    title: 'It reads your PayPal account',
    body: 'Invoices, payments, drafts and aging, straight from the PayPal REST APIs. No spreadsheets, no exports.',
  },
  {
    title: 'It works out what to do',
    body: 'Who to chase first, how firm to be, which drafts never went out. Every proposal comes with its reason.',
  },
  {
    title: 'You approve, PayPal acts',
    body: 'Edit the message, approve or dismiss. Only an approval calls PayPal, and the dashboard updates as it lands.',
  },
];

const GUARD_RAILS = [
  {
    title: 'The agent cannot send',
    body: 'It has no tool that calls PayPal. It can only add proposals to your queue.',
  },
  {
    title: 'No invented invoices',
    body: 'Each proposal is checked against your real invoice list. Anything that does not match is rejected back to the agent.',
  },
  {
    title: 'Figures come from PayPal',
    body: 'The customer, invoice number and amount you approve are read from PayPal, not from the model.',
  },
];

// One page per PayPal endpoint the app reads, each in app/(endpoints).
const ENDPOINTS = [
  { href: '/invoices', label: 'Invoices', detail: 'GET /v2/invoicing/invoices' },
  { href: '/products', label: 'Catalog products', detail: 'GET /v1/catalogs/products' },
  { href: '/plans', label: 'Billing plans', detail: 'GET /v1/billing/plans' },
  { href: '/transactions', label: 'Transactions', detail: 'GET /v1/reporting/transactions' },
  { href: '/balances', label: 'Balances', detail: 'GET /v1/reporting/balances' },
];

// An illustration of one proposal in the approval queue, with made-up figures.
function SampleProposal() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-pp-border bg-white p-5 shadow-xl shadow-pp-navy/10" aria-hidden>
      <p className="text-xs font-semibold uppercase tracking-wider text-pp-muted">Action queue · example</p>
      <div className="mt-3 rounded-lg border border-pp-border p-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-pp-highlight px-1.5 py-0.5 text-xs font-semibold text-pp-blue-dark">Send reminder</span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-pp-danger">Firm</span>
          <span className="text-sm font-semibold">Atlas Freight Co</span>
          <span className="ml-auto text-sm font-semibold tabular-nums">$8,400.00</span>
        </div>
        <p className="mt-1 text-xs text-pp-muted">Invoice 0142 · 74 days overdue, largest balance</p>
        <div className="mt-2 rounded bg-pp-canvas px-2 py-1.5 text-sm">
          <p className="font-semibold">Payment requested this week: invoice 0142</p>
          <p className="mt-0.5 text-pp-muted">
            Hi Sofia, invoice 0142 for $8,400.00 was due on 28 August and is now 74 days overdue. Please reply this week
            with your payment date.
          </p>
        </div>
        <div className="mt-2 flex justify-end gap-2 text-xs font-semibold">
          <span className="rounded-full border border-pp-border px-3 py-1">Edit</span>
          <span className="rounded-full border border-pp-border px-3 py-1">Dismiss</span>
          <span className="rounded-full bg-pp-blue px-3 py-1 text-white">Approve</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh bg-pp-canvas font-paypal text-pp-ink">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-5">
        <BrandLockup />
        <nav className="ml-auto flex items-center gap-5 text-sm font-semibold">
          <a href="#how-it-works" className="hidden text-pp-navy hover:text-pp-blue sm:inline">
            How it works
          </a>
          <a href="#guard-rails" className="hidden text-pp-navy hover:text-pp-blue sm:inline">
            Guard rails
          </a>
          <Link href="/dashboard" className="rounded-full bg-pp-blue px-4 py-2 text-white hover:bg-pp-blue-dark">
            Open dashboard
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-pp-blue">{BRAND.tagline}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-pp-navy sm:text-5xl">
              Stop chasing invoices. Approve the chase instead.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pp-muted">
              {BRAND.name} reads your PayPal invoices, works out who owes you and how late they are, and drafts every
              follow-up. Nothing is sent until you say so.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-pp-blue px-6 py-3 text-base font-semibold text-white hover:bg-pp-blue-dark"
              >
                Open the dashboard
              </Link>
              <a href="#how-it-works" className="text-base font-semibold text-pp-blue hover:underline">
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm text-pp-muted">Runs on the PayPal sandbox. Built on PayPal REST APIs and AG Studio.</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <SampleProposal />
          </div>
        </section>

        <section id="how-it-works" className="border-y border-pp-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-semibold text-pp-navy">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="flex size-9 items-center justify-center rounded-full bg-pp-highlight text-sm font-semibold text-pp-blue-dark">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-pp-navy">{step.title}</h3>
                  <p className="mt-2 text-pp-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="guard-rails" className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-pp-navy">An agent you can trust with money</h2>
          <p className="mt-2 max-w-2xl text-pp-muted">
            The agent proposes and a person approves. That rule is built into the code, not left to a prompt.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {GUARD_RAILS.map((rail) => (
              <li key={rail.title} className="rounded-xl border border-pp-border bg-white p-5">
                <h3 className="font-semibold text-pp-navy">{rail.title}</h3>
                <p className="mt-2 text-sm text-pp-muted">{rail.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-pp-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-pp-muted">Under the hood: the PayPal data</h2>
            <p className="mt-2 max-w-2xl text-sm text-pp-muted">
              Each page shows what one PayPal endpoint returns, in an AG Grid. Transactions and balances need the
              sandbox app&apos;s Transaction search feature.
            </p>
            <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {ENDPOINTS.map((page) => (
                <li key={page.href} className="border-b border-pp-border">
                  <Link href={page.href} className="flex items-baseline justify-between gap-4 py-3 hover:text-pp-blue">
                    <span className="font-semibold">{page.label}</span>
                    <code className="text-xs text-pp-muted">{page.detail}</code>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-sm text-pp-muted">
        <span>{BRAND.name}, built for the PayPal AI Hackathon.</span>
        <Link href="/dashboard" className="ml-auto font-semibold text-pp-blue hover:underline">
          Open dashboard
        </Link>
      </footer>
    </div>
  );
}
