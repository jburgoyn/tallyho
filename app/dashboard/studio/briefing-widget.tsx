'use client';

// The briefing: a custom AG Studio widget that opens the dashboard with what matters today (how much
// is overdue, who owes it, what never went out) and one-click requests to the cash-flow agent.
// It reads the account's PayPal data directly, so it describes the whole account whatever the
// page's filters say, and the approval queue, so it can show what the agent has done so far.

import { useState, useSyncExternalStore } from 'react';
import type { AgBaseWidgetDefinition } from 'ag-studio';
import type { DashboardData } from '@/lib/dashboard-data';
import { getActions, getServerActions, subscribe, type QueuedAction } from '../actions-store';
import { getFacts, getServerFacts, subscribeFacts } from '../facts-store';
import { askAgent } from './ai';

export const BRIEFING_WIDGET = 'cash-briefing';

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

type Briefing = {
  currency: string;
  overdue: number;
  overdueCount: number;
  oldestDays: number;
  oldestCustomer: string;
  topDebtor: string;
  topDebtorAmount: number;
  dueSoon: number;
  dueSoonCount: number;
  drafts: number;
  draftCount: number;
  otherCurrencies: number;
};

// Figures are for the currency with the most overdue money; others are counted, never added in.
function briefingOf(data: DashboardData): Briefing | undefined {
  const receivable = data.invoices.filter((i) => i.isReceivable);
  const drafts = data.invoices.filter((i) => i.statusGroup === 'Draft');
  if (receivable.length === 0 && drafts.length === 0) return undefined;

  const overdueBy = new Map<string, number>();
  for (const i of receivable) overdueBy.set(i.currency, (overdueBy.get(i.currency) ?? 0) + i.overdueAmount);
  for (const i of drafts) if (!overdueBy.has(i.currency)) overdueBy.set(i.currency, 0);
  const [currency] = [...overdueBy.entries()].sort((a, b) => b[1] - a[1])[0];

  const mine = receivable.filter((i) => i.currency === currency);
  const overdue = mine.filter((i) => i.daysOverdue > 0);
  const oldest = [...overdue].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
  const nameOf = (customerId: string) => {
    const customer = data.customers.find((c) => c.id === customerId);
    return customer ? (customer.company && customer.company !== 'Individual' ? customer.company : customer.name) : customerId;
  };

  const owedBy = new Map<string, number>();
  for (const i of overdue) owedBy.set(i.customerId, (owedBy.get(i.customerId) ?? 0) + i.overdueAmount);
  const top = [...owedBy.entries()].sort((a, b) => b[1] - a[1])[0];

  const dueSoon = mine.filter((i) => i.daysOverdue === 0);
  const myDrafts = drafts.filter((i) => i.currency === currency);
  const sum = (rows: typeof mine, of: (row: (typeof mine)[number]) => number) => rows.reduce((total, row) => total + of(row), 0);

  return {
    currency,
    overdue: sum(overdue, (i) => i.overdueAmount),
    overdueCount: overdue.length,
    oldestDays: oldest?.daysOverdue ?? 0,
    oldestCustomer: oldest ? nameOf(oldest.customerId) : '',
    topDebtor: top ? nameOf(top[0]) : '',
    topDebtorAmount: top?.[1] ?? 0,
    dueSoon: sum(dueSoon, (i) => i.outstanding),
    dueSoonCount: dueSoon.length,
    drafts: sum(myDrafts, (i) => i.total),
    draftCount: myDrafts.length,
    otherCurrencies: overdueBy.size - 1,
  };
}

// What the agent's approved actions add up to this session, in the briefing's currency.
function progressOf(actions: QueuedAction[], currency: string) {
  const done = actions.filter((a) => a.status === 'done' && a.currency === currency);
  const total = (type: QueuedAction['type']) => done.filter((a) => a.type === type).reduce((sum, a) => sum + a.amount, 0);
  return {
    chased: total('remind'),
    reminders: done.filter((a) => a.type === 'remind').length,
    recovered: total('record_payment'),
    sent: total('send'),
    waiting: actions.filter((a) => a.status === 'proposed' || a.status === 'failed').length,
  };
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/10 px-3 py-2">
      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums text-white">{value}</p>
      <p className="hidden truncate text-xs text-white/70 @4xl:block">{detail}</p>
    </div>
  );
}

function AskButton({ primary, prompt, children }: { primary?: boolean; prompt: string; children: string }) {
  const [state, setState] = useState<'idle' | 'asking' | 'unavailable'>('idle');
  return (
    <button
      type="button"
      disabled={state === 'asking'}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
        primary ? 'bg-white text-pp-navy hover:bg-pp-highlight' : 'border border-white/40 text-white hover:bg-white/10'
      }`}
      onClick={async () => {
        setState('asking');
        const asked = await askAgent(prompt).catch(() => false);
        setState(asked ? 'idle' : 'unavailable');
      }}
    >
      {state === 'unavailable' ? 'Agent not configured' : children}
    </button>
  );
}

function CashBriefing() {
  const data = useSyncExternalStore(subscribeFacts, getFacts, getServerFacts);
  const actions = useSyncExternalStore(subscribe, getActions, getServerActions);
  const briefing = data && briefingOf(data);

  if (!briefing) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-pp-navy p-4 text-sm text-white/80">
        No open invoices yet. Create some in PayPal, or run the seed script, and the briefing appears here.
      </div>
    );
  }

  const { currency } = briefing;
  const progress = progressOf(actions, currency);
  const clear = briefing.overdueCount === 0;

  return (
    // A container, so the briefing tightens up when the AI Assistant narrows the canvas beside it.
    <div className="@container h-full">
    <div className="flex h-full flex-col justify-between gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-pp-navy via-pp-blue-dark to-pp-blue p-4 text-white">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Cash-flow briefing</p>
          <h2 className="mt-1 text-xl font-semibold leading-tight @4xl:text-2xl">
            {clear ? (
              'Nothing is overdue. Nice work.'
            ) : (
              <>
                <span className="tabular-nums">{money(briefing.overdue, currency)}</span> is overdue across{' '}
                {plural(briefing.overdueCount, 'invoice')}
              </>
            )}
          </h2>
          {!clear && (
            <p className="mt-1 hidden text-sm text-white/80 @4xl:block">
              Oldest is {briefing.oldestCustomer}, {plural(briefing.oldestDays, 'day')} late. {briefing.topDebtor} owes the
              most: {money(briefing.topDebtorAmount, currency)}.
              {briefing.otherCurrencies > 0 &&
                ` Figures are in ${currency}; ${briefing.otherCurrencies === 1 ? '1 other currency is' : `${briefing.otherCurrencies} other currencies are`} not shown.`}
            </p>
          )}
        </div>

        <div className="grid flex-1 basis-80 grid-cols-3 gap-2">
          <Stat label="Due soon" value={money(briefing.dueSoon, currency)} detail={`${plural(briefing.dueSoonCount, 'invoice')} not yet due`} />
          <Stat label="Never sent" value={money(briefing.drafts, currency)} detail={plural(briefing.draftCount, 'draft')} />
          <Stat
            label="Agent so far"
            value={money(progress.chased + progress.recovered + progress.sent, currency)}
            detail={
              progress.waiting > 0
                ? `${plural(progress.waiting, 'action')} awaiting you`
                : progress.reminders + progress.recovered + progress.sent > 0
                  ? 'chased, sent or recovered'
                  : 'no actions approved yet'
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!clear && (
          <AskButton
            primary
            prompt="Find every overdue invoice, work out who is worth chasing first, and propose a reminder for each with a message that fits how late it is."
          >
            Chase overdue invoices
          </AskButton>
        )}
        {briefing.draftCount > 0 && (
          <AskButton prompt="I have draft invoices that never went out. Propose sending them.">
            {`Send ${plural(briefing.draftCount, 'draft')}`}
          </AskButton>
        )}
        <AskButton prompt="Where is my money stuck right now? Give me the three biggest problems and what you would do about each.">
          Where is my cash stuck?
        </AskButton>
        <p className="ml-auto hidden text-xs text-white/70 @4xl:block">
          The agent proposes. Nothing reaches PayPal until you approve it.
        </p>
      </div>
    </div>
    </div>
  );
}

export const briefingWidget: AgBaseWidgetDefinition<typeof BRIEFING_WIDGET> = {
  id: BRIEFING_WIDGET,
  label: 'Cash-flow briefing',
  comp: CashBriefing,
  form: ({ createDefaults }) => createDefaults({}),
  defaultSize: { width: 24, height: 13 },
  minSize: { width: 12, height: 9 },
  ai: {
    label: 'Cash-flow briefing',
    description:
      'A banner summarising the account: overdue total and count, oldest and largest debtor, money due soon, unsent drafts, and what the agent has done. Has buttons that ask the cash-flow agent to act.',
    usage: 'Place one full-width at the top of a collections or receivables page. It takes no data mapping.',
  },
};
