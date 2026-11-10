// The approval queue: actions the cash-flow agent has proposed, waiting for a person to approve or
// dismiss them. Kept in localStorage and read with useSyncExternalStore, so the agent's
// tool (./studio/ai.ts) and the queue widget (./studio/action-queue-widget.tsx) share one list.

import type { ActionRequest } from '@/lib/actions';

export type ActionStatus = 'proposed' | 'running' | 'done' | 'failed' | 'dismissed';

export type QueuedAction = ActionRequest & {
  id: string;
  /** Shown to the approver, so they need not look the invoice up. */
  invoiceNumber: string;
  customer: string;
  amount: number;
  currency: string;
  /** Why the agent proposed it. */
  reason: string;
  status: ActionStatus;
  error?: string;
};

const STORAGE_KEY = 'cashflow-agent:action-queue';

// The queue survives a reload. An action that was mid-flight when the page went away may or may not
// have reached PayPal, so it comes back as failed with a warning rather than as safe to resend.
function load(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as QueuedAction[];
    return stored.map((a) =>
      a.status === 'running'
        ? { ...a, status: 'failed' as const, error: 'Interrupted by a page reload. Check the invoice in PayPal before retrying.' }
        : a,
    );
  } catch {
    return [];
  }
}

let actions: QueuedAction[] = load();
const listeners = new Set<() => void>();

const set = (next: QueuedAction[]) => {
  actions = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is full or blocked: the queue still works for this session.
  }
  listeners.forEach((listener) => listener());
};

const patch = (id: string, change: Partial<QueuedAction>) =>
  set(actions.map((a) => (a.id === id ? { ...a, ...change } : a)));

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getActions = () => actions;
const NONE: QueuedAction[] = [];
export const getServerActions = () => NONE;

/** Add proposals, replacing any still-pending proposal of the same type for the same invoice. */
export function propose(items: Omit<QueuedAction, 'id' | 'status'>[]): QueuedAction[] {
  const added = items.map((item) => ({
    ...item,
    id: `action-${crypto.randomUUID().slice(0, 8)}`,
    status: 'proposed' as const,
  }));
  const replaced = (a: QueuedAction) =>
    a.status === 'proposed' && added.some((n) => n.invoiceId === a.invoiceId && n.type === a.type);
  set([...added, ...actions.filter((a) => !replaced(a))]);
  return added;
}

export const edit = (id: string, change: Pick<QueuedAction, 'subject' | 'note'>) => patch(id, change);
export const dismiss = (id: string) => patch(id, { status: 'dismissed' });
export const clearFinished = () => set(actions.filter((a) => a.status === 'proposed' || a.status === 'running'));

/** Carry out one approved action through the server, which calls PayPal. */
export async function approve(id: string): Promise<void> {
  const action = actions.find((a) => a.id === id);
  if (!action || (action.status !== 'proposed' && action.status !== 'failed')) return;
  patch(id, { status: 'running', error: undefined });
  try {
    const { type, invoiceId, subject, note } = action;
    const res = await fetch('/api/paypal/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, invoiceId, subject, note }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
    }
    patch(id, { status: 'done' });
  } catch (e) {
    patch(id, { status: 'failed', error: e instanceof Error ? e.message : String(e) });
  }
}
