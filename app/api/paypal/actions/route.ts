import {
  ACTION_TYPES,
  EMAIL_ACTIONS,
  MAX_NOTE,
  MAX_SUBJECT,
  PAYMENT_METHODS,
  type ActionRequest,
} from '@/lib/actions';
import { cancelInvoice, PayPalApiError, recordInvoicePayment, remindInvoice, sendInvoice } from '@/lib/paypal';

// Carries out one approved action against the PayPal sandbox. The browser posts here only when a
// person clicks Approve in the action queue; the agent has no way to call this itself.
//
// lib/paypal.ts only talks to the sandbox. On a public deployment, proxy.ts gates this route.

const EMAIL = { remind: remindInvoice, send: sendInvoice, cancel: cancelInvoice } as const;

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
  if (!type) return error(400, `type must be one of: ${ACTION_TYPES.join(', ')}.`);
  if (!invoiceId || !/^[A-Za-z0-9-]+$/.test(invoiceId)) return error(400, 'invoiceId is missing or malformed.');

  try {
    if (type === 'record_payment') {
      const payment = (body.payment ?? {}) as Record<string, unknown>;
      const amount = typeof payment.amount === 'number' && Number.isFinite(payment.amount) ? payment.amount : 0;
      const currency = typeof payment.currency === 'string' && /^[A-Z]{3}$/.test(payment.currency) ? payment.currency : undefined;
      const method = PAYMENT_METHODS.find((m) => m === payment.method);
      if (amount <= 0 || !currency || !method) return error(400, 'payment needs a positive amount, a currency and a method.');
      await recordInvoicePayment(invoiceId, { amount, currency, method, note: text(body.note, MAX_NOTE) ?? '' });
    } else {
      const subject = text(body.subject, MAX_SUBJECT);
      const note = text(body.note, MAX_NOTE);
      if (!EMAIL_ACTIONS.has(type) || !subject || !note) return error(400, 'subject and note are required.');
      await EMAIL[type](invoiceId, subject, note);
    }
  } catch (e) {
    if (e instanceof PayPalApiError) return error(e.status >= 500 ? 502 : e.status, e.message);
    throw e;
  }
  return Response.json({ ok: true });
}
