'use client';

// The approval queue as a custom AG Studio widget. The cash-flow agent proposes actions (see
// ./ai.ts); this is where a person reads, edits and approves them. Nothing reaches PayPal until
// Approve is clicked.

import { useState, useSyncExternalStore } from 'react';
import type { AgBaseWidgetDefinition, AgDefaultRegistry, AgDefaultWidgetDefinition } from 'ag-studio';
import { ACTION_LABEL, EMAIL_ACTIONS } from '@/lib/actions';
import type { briefingWidget } from './briefing-widget';
import {
  approve,
  clearFinished,
  dismiss,
  edit,
  getActions,
  getServerActions,
  subscribe,
  type ActionStatus,
  type QueuedAction,
} from '../actions-store';

export const ACTION_QUEUE_WIDGET = 'action-queue';

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

const STATUS: Partial<Record<ActionStatus, { text: string; className: string }>> = {
  running: { text: 'Working…', className: 'text-pp-muted' },
  done: { text: 'Done', className: 'text-pp-success' },
  failed: { text: 'Failed', className: 'text-pp-danger' },
  dismissed: { text: 'Dismissed', className: 'text-pp-muted' },
};

// How hard a reminder pushes, which follows how late the invoice is (the agent is told the same bands).
function toneOf(action: QueuedAction): { text: string; className: string } | undefined {
  if (action.type !== 'remind') return undefined;
  if (action.daysOverdue > 60) return { text: 'Firm', className: 'bg-red-50 text-pp-danger' };
  if (action.daysOverdue > 30) return { text: 'Direct', className: 'bg-amber-50 text-pp-warning' };
  return { text: 'Nudge', className: 'bg-emerald-50 text-pp-success' };
}

const METHOD_LABEL = (method: string) => method[0] + method.slice(1).toLowerCase().replaceAll('_', ' ');

function ActionCard({ action }: { action: QueuedAction }) {
  const emails = EMAIL_ACTIONS.has(action.type);
  const tone = toneOf(action);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(action.subject);
  const [note, setNote] = useState(action.note);
  const open = action.status === 'proposed' || action.status === 'failed';
  const status = STATUS[action.status];

  return (
    <li className="rounded-lg border border-pp-border bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="whitespace-nowrap rounded bg-pp-highlight px-1.5 py-0.5 text-xs font-semibold text-pp-blue-dark">
          {ACTION_LABEL[action.type]}
        </span>
        {tone && (
          <span className={`whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${tone.className}`}>{tone.text}</span>
        )}
        <span className="min-w-0 truncate text-sm font-semibold text-pp-ink">{action.customer}</span>
        <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-pp-ink">
          {money(action.amount, action.currency)}
        </span>
      </div>
      <p className="mt-1 text-xs text-pp-muted">
        Invoice {action.invoiceNumber} · {action.reason}
      </p>

      {!emails ? (
        <div className="mt-2 rounded bg-pp-canvas px-2 py-1.5 text-sm text-pp-ink">
          <p className="font-semibold">
            Mark {money(action.amount, action.currency)} as received
            {action.payment && ` by ${METHOD_LABEL(action.payment.method).toLowerCase()}`}
          </p>
          {action.note && <p className="mt-0.5 whitespace-pre-wrap text-pp-muted">{action.note}</p>}
        </div>
      ) : editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <input
            className="rounded border border-pp-border px-2 py-1 text-sm"
            aria-label="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="min-h-24 rounded border border-pp-border px-2 py-1 text-sm"
            aria-label="Email message"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      ) : (
        <div className="mt-2 rounded bg-pp-canvas px-2 py-1.5 text-sm text-pp-ink">
          <p className="font-semibold">{action.subject}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-pp-muted">{action.note}</p>
        </div>
      )}

      {action.error && <p className="mt-2 text-xs text-pp-danger">{action.error}</p>}

      <div className="mt-2 flex items-center gap-2">
        {status && <span className={`text-xs font-semibold ${status.className}`}>{status.text}</span>}
        {open && (
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            {!emails ? null : editing ? (
              <button
                type="button"
                className="rounded-full border border-pp-border px-3 py-1 text-xs font-semibold text-pp-ink"
                disabled={!subject.trim() || !note.trim()}
                onClick={() => {
                  edit(action.id, { subject: subject.trim(), note: note.trim() });
                  setEditing(false);
                }}
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                className="rounded-full border border-pp-border px-3 py-1 text-xs font-semibold text-pp-ink"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-pp-border px-3 py-1 text-xs font-semibold text-pp-ink"
              onClick={() => dismiss(action.id)}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="rounded-full bg-pp-blue px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              disabled={editing}
              onClick={() => approve(action.id)}
            >
              {action.status === 'failed' ? 'Retry' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function ActionQueue() {
  const actions = useSyncExternalStore(subscribe, getActions, getServerActions);
  const pending = actions.filter((a) => a.status === 'proposed' || a.status === 'failed');
  const finished = actions.length - pending.length;

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="whitespace-nowrap text-sm font-bold text-pp-ink">Action queue</h3>
        <span className="whitespace-nowrap text-xs text-pp-muted">
          {pending.length} awaiting approval
          {pending.length > 0 &&
            ` · ${[...new Set(pending.map((a) => a.currency))]
              .map((c) => money(pending.filter((a) => a.currency === c).reduce((sum, a) => sum + a.amount, 0), c))
              .join(' + ')}`}
        </span>
        {pending.length > 1 && (
          <button
            type="button"
            className="ml-auto whitespace-nowrap rounded-full bg-pp-blue px-3 py-1 text-xs font-semibold text-white"
            onClick={() => pending.forEach((a) => approve(a.id))}
          >
            Approve all
          </button>
        )}
        {finished > 0 && (
          <button
            type="button"
            className={`${pending.length > 1 ? '' : 'ml-auto'} whitespace-nowrap text-xs font-semibold text-pp-blue`}
            onClick={clearFinished}
          >
            Clear finished
          </button>
        )}
      </div>

      {actions.length === 0 ? (
        <p className="m-auto max-w-xs text-center text-sm text-pp-muted">
          Nothing to approve. Ask the cash-flow agent to chase overdue invoices and its proposals will appear here.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {actions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </ul>
      )}
    </div>
  );
}

export const actionQueueWidget: AgBaseWidgetDefinition<typeof ACTION_QUEUE_WIDGET> = {
  id: ACTION_QUEUE_WIDGET,
  label: 'Action queue',
  comp: ActionQueue,
  form: ({ createDefaults }) => createDefaults({}),
  defaultSize: { width: 10, height: 24 },
  minSize: { width: 6, height: 10 },
  ai: {
    label: 'Action queue',
    description:
      'Lists the PayPal actions the cash-flow agent has proposed (invoice reminders, sends, cancellations and recorded payments) so a person can edit, approve or dismiss each one.',
    usage: 'Add one to any page where the user reviews proposed actions. It takes no data mapping.',
  },
};

/** Studio's own widgets plus the action queue, so widget ids type-check wherever they are listed. */
export type CashflowRegistry = Omit<AgDefaultRegistry, 'widgets'> & {
  widgets: readonly (AgDefaultWidgetDefinition | typeof actionQueueWidget | typeof briefingWidget)[];
};
