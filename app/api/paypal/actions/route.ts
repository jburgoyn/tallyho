import { ACTION_TYPES, MAX_NOTE, MAX_SUBJECT, type ActionRequest, type ActionType } from '@/lib/actions';
import { cancelInvoice, PayPalApiError, remindInvoice, sendInvoice } from '@/lib/paypal';

// Carries out one approved action against the PayPal sandbox. The browser posts here only when a
// person clicks Approve in the action queue; the agent has no way to call this itself.
//
// Like the AI proxy, this route has no auth or rate limiting. lib/paypal.ts only talks to the
// sandbox, but add auth before deploying this anywhere public.

const RUN: Record<ActionType, (id: string, subject: string, note: string) => Promise<void>> = {
  remind: remindInvoice,
  send: sendInvoice,
  cancel: cancelInvoice,
};

const error = (status: number, message: string) => Response.json({ error: { message } }, { status });

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : undefined;

export async function POST(request: Request) {
  let body: Partial<Record<keyof ActionRequest, unknown>>;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Request body must be JSON.');
  }

  const type = ACTION_TYPES.find((t) => t === body.type);
  const invoiceId = text(body.invoiceId, 64);
  const subject = text(body.subject, MAX_SUBJECT);
  const note = text(body.note, MAX_NOTE);
  if (!type) return error(400, `type must be one of: ${ACTION_TYPES.join(', ')}.`);
  if (!invoiceId || !/^[A-Za-z0-9-]+$/.test(invoiceId)) return error(400, 'invoiceId is missing or malformed.');
  if (!subject || !note) return error(400, 'subject and note are required.');

  try {
    await RUN[type](invoiceId, subject, note);
  } catch (e) {
    if (e instanceof PayPalApiError) return error(e.status >= 500 ? 502 : e.status, e.message);
    throw e;
  }
  return Response.json({ ok: true });
}
