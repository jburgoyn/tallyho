// The actions the cash-flow agent may propose, shared by the browser (the approval queue) and the
// server (app/api/paypal/actions). The agent only ever proposes; a person approves each one.

export const ACTION_TYPES = ['remind', 'send', 'cancel', 'record_payment'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const ACTION_LABEL: Record<ActionType, string> = {
  remind: 'Send reminder',
  send: 'Send invoice',
  cancel: 'Cancel invoice',
  record_payment: 'Record payment',
};

/** The actions that email the customer, and so carry a subject and a message. */
export const EMAIL_ACTIONS: ReadonlySet<ActionType> = new Set(['remind', 'send', 'cancel']);

// How a payment made outside PayPal arrived, as PayPal's Invoicing API names them.
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'CHECK', 'CREDIT_CARD', 'DEBIT_CARD', 'WIRE_TRANSFER', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** What the server needs to carry out one action. */
export type ActionRequest = {
  type: ActionType;
  invoiceId: string;
  /** Email actions: subject line of the email PayPal sends to the customer. */
  subject: string;
  /** Email actions: body of that email. record_payment: a note kept on the payment. */
  note: string;
  /** record_payment only: what was paid, in the invoice's currency. */
  payment?: { amount: number; currency: string; method: PaymentMethod };
};

export const MAX_SUBJECT = 200;
export const MAX_NOTE = 2000;
